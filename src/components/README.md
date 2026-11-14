# Where to edit

App.jsx now contains the page arrangement and existing data state.
All appearance rules remain in ../app.css.

| Change | File |
| --- | --- |
| Sidebar logo and profile | ../App.jsx (search SIDEBAR) |
| Sidebar button labels and icons | ../App.jsx (search BUTTON 1 through BUTTON 5) |
| Top workspace bar | TopBar.jsx |
| Page title and introduction | PageHeader.jsx |
| Month and sensor controls | Filters.jsx |
| Loading and error notices | StatusMessages.jsx |
| Summary cards | ../App.jsx (search SUMMARY BOX GRID) |
| Overview page | OverviewPage.jsx |
| Map page | MapPage.jsx |
| Map tiles and observation markers | FireMap.jsx |
| Automatic map fitting and resizing | FitMap.jsx, ResizeMap.jsx |
| Calendar page | CalendarPage.jsx |
| Clickable date buttons | Calendar.jsx |
| Date popup layout and close button | DatePopup.jsx |
| Pie chart sample values, labels, and colors | ObservationPieChart.jsx |
| Empty popup table columns | ObservationTable.jsx |
| Sensor comparison | ComparisonPage.jsx |
| Data and methodology | SourcesPage.jsx |
| Credits | Footer.jsx |

The pie chart retains your sample values. The table remains empty. No backend was added.

## CSS class guide

Search these class names in app.css to change the matching component.

| Part | Class |
| --- | --- |
| Whole app layout | app-layout |
| Sidebar logo | sidebar-logo |
| Sidebar buttons | sidebar-button |
| Selected sidebar button | sidebar-button-active |
| Top bar | workspace-header |
| Main content grid | page-content |
| Page heading | page-heading |
| Filter controls | filter-controls |
| Summary cards | summary-cards, summary-card |
| Page panels | page-sections, page-panel |
| Map container | map-container |
| Calendar dates | calendar-day |
| Date popup | date-popup |
| Popup close button | date-popup-close-button |
| Pie chart section | pie-chart-panel |
| Popup table | observation-table |

## How each component is organized

1. Imports at the top load the parts the component uses.
2. Named values and event handlers come next.
3. The return section contains the visible layout. Edit text and divs there.
4. Matching class names in ../app.css control the appearance.

Start with DatePopup.jsx to arrange the popup. Open ObservationPieChart.jsx for chartData (numbers/colors) and chartOptions (legend). Open ObservationTable.jsx for table columns.

The old Sidebar.jsx, SummaryCards.jsx, Metric.jsx, and navigation.js copies were removed because their editable layout is now directly in App.jsx.

## Simple syntax guide

- App.jsx is numbered: selections, dates, data loading, totals, button actions, page choice, messages, visible layout.
- A function with a name is an action, such as openMap or closeDatePopup.
- if (...) chooses what to show or which action to take.
- for (...) repeats code for each calendar date or observation.
- The return (...) section contains the visible divs, buttons, and other components.
- Curly braces in JSX display a JavaScript value, such as {date} or {total}.
- A prop passes a value to a component. For example, month={month} passes the selected month.
- useState remembers a value between screen updates. useEffect runs work after a selection changes.

## Dashboard animations

- SplashScreen.jsx: logo and 2-second intro timing (runs on each page refresh).
- CountUpNumber.jsx: 1-second number animation; original values remain unchanged.
- SidebarHighlight.jsx: moves the active highlight behind the direct buttons in App.jsx.
- app.css: search DASHBOARD ANIMATIONS for entrance delays, hover, logo glow, and radar effects.
- App.jsx: showSplash controls the intro; card numbers use CountUpNumber.
- Reduced-motion preferences skip the intro and disable decorative motion.

## Fire owl intro (reference-inspired)

- SplashScreen.jsx: intro timing and original logo path (4.6 seconds after the logo loads).
- FireOwl.jsx: animated owl wings and the exact original PNG logo reveal.
- FireEmbers.jsx: moving fire particles.
- splash-screen.css: flight path, wing beats, glow, and logo transition.
- Original image: public/assets/fire_owl.png (unchanged).

