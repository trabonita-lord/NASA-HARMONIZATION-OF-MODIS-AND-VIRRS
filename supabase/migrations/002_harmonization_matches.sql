
-- ============================================================
-- TANAW Migration 002: MODIS–VIIRS Harmonization Matches
-- ============================================================
-- Purpose:
-- Store candidate associations between MODIS and VIIRS
-- fire observations.
--
-- IMPORTANT:
-- These matches represent candidate associations,
-- NOT scientifically verified fire events.
--
-- Dependencies:
-- public.fire_observations (Migration 001)
--
-- Run this migration only on a database where the
-- harmonization_matches table does not already exist.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE HARMONIZATION MATCHES TABLE
-- ============================================================

CREATE TABLE public.harmonization_matches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    modis_observation_id BIGINT NOT NULL
        REFERENCES public.fire_observations(id)
        ON DELETE CASCADE,

    viirs_observation_id BIGINT NOT NULL
        REFERENCES public.fire_observations(id)
        ON DELETE CASCADE,

    distance_km DOUBLE PRECISION NOT NULL
        CHECK (
            distance_km >= 0
            AND distance_km < 'Infinity'::double precision
        ),

    time_difference_minutes DOUBLE PRECISION NOT NULL
        CHECK (
            time_difference_minutes >= 0
            AND time_difference_minutes < 'Infinity'::double precision
        ),

    match_rank INTEGER NOT NULL
        CHECK (match_rank >= 1),

    distance_threshold_km DOUBLE PRECISION NOT NULL
        CHECK (
            distance_threshold_km > 0
            AND distance_threshold_km < 'Infinity'::double precision
        ),

    time_threshold_minutes DOUBLE PRECISION NOT NULL
        CHECK (
            time_threshold_minutes > 0
            AND time_threshold_minutes < 'Infinity'::double precision
        ),

    algorithm_version TEXT NOT NULL
        CHECK (length(trim(algorithm_version)) > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent matching an observation with itself.
    CONSTRAINT harmonization_matches_distinct_observations
        CHECK (
            modis_observation_id <> viirs_observation_id
        ),

    -- Candidate matches must satisfy their thresholds.
    CONSTRAINT harmonization_matches_within_thresholds
        CHECK (
            distance_km <= distance_threshold_km
            AND time_difference_minutes <= time_threshold_minutes
        ),

    -- Prevent duplicate observation pairs for the
    -- same algorithm and matching configuration.
    CONSTRAINT harmonization_matches_unique_pair
        UNIQUE (
            modis_observation_id,
            viirs_observation_id,
            algorithm_version,
            distance_threshold_km,
            time_threshold_minutes
        ),

    -- Prevent duplicate ranks for one MODIS observation
    -- under the same matching configuration.
    CONSTRAINT harmonization_matches_unique_rank
        UNIQUE (
            modis_observation_id,
            algorithm_version,
            distance_threshold_km,
            time_threshold_minutes,
            match_rank
        )
);

-- ============================================================
-- 2. VALIDATE MODIS AND VIIRS SENSOR REFERENCES
-- ============================================================
-- Foreign keys ensure that observation IDs exist.
-- This trigger additionally ensures that the IDs
-- reference observations from the correct sensors.

CREATE FUNCTION public.validate_harmonization_match_sensors()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN

    -- MODIS reference must point to a MODIS observation.
    IF NOT EXISTS (
        SELECT 1
        FROM public.fire_observations
        WHERE id = NEW.modis_observation_id
          AND sensor = 'MODIS'
    ) THEN
        RAISE EXCEPTION
            'modis_observation_id must reference a MODIS observation';
    END IF;

    -- VIIRS reference must point to a VIIRS observation.
    IF NOT EXISTS (
        SELECT 1
        FROM public.fire_observations
        WHERE id = NEW.viirs_observation_id
          AND sensor = 'VIIRS'
    ) THEN
        RAISE EXCEPTION
            'viirs_observation_id must reference a VIIRS observation';
    END IF;

    RETURN NEW;

END;
$$;

-- ============================================================
-- 3. CREATE SENSOR VALIDATION TRIGGER
-- ============================================================

CREATE TRIGGER harmonization_matches_sensor_guard

BEFORE INSERT OR UPDATE OF
    modis_observation_id,
    viirs_observation_id

ON public.harmonization_matches

FOR EACH ROW

EXECUTE FUNCTION
    public.validate_harmonization_match_sensors();

-- ============================================================
-- 4. CREATE PERFORMANCE INDEXES
-- ============================================================

-- Improve lookup performance by VIIRS observation ID.
CREATE INDEX harmonization_matches_viirs_idx
ON public.harmonization_matches (
    viirs_observation_id
);

-- Improve filtering by algorithm and matching thresholds.
CREATE INDEX harmonization_matches_config_idx
ON public.harmonization_matches (
    algorithm_version,
    distance_threshold_km,
    time_threshold_minutes
);

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.harmonization_matches
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CREATE PUBLIC READ POLICY
-- ============================================================
-- Anonymous and authenticated clients may read matches.
-- They must not modify match records.

CREATE POLICY "Public read harmonization matches"
ON public.harmonization_matches
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================
-- 7. CONFIGURE READ-ONLY TABLE PERMISSIONS
-- ============================================================

-- Remove all table privileges from public-facing roles.
REVOKE ALL PRIVILEGES
ON TABLE public.harmonization_matches
FROM PUBLIC, anon, authenticated;

-- Grant only SELECT to public-facing roles.
GRANT SELECT
ON TABLE public.harmonization_matches
TO anon, authenticated;

-- ============================================================
-- 8. PROTECT INTERNAL TRIGGER FUNCTION
-- ============================================================
-- Public clients do not need direct EXECUTE permission
-- on the sensor validation function.

REVOKE ALL
ON FUNCTION public.validate_harmonization_match_sensors()
FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 9. COMPLETE MIGRATION
-- ============================================================

COMMIT;

-- ============================================================
-- END OF TANAW MIGRATION 002
-- ============================================================