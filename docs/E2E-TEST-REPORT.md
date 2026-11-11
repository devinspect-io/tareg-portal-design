# Tareg portal: end-to-end test report

**Date:** 11 Nov 2026  
**Result:** 86 scenarios, 84 passed, 2 failed

## What was tested

| Item | Version |
|---|---|
| Portal (`tareg-portal-design`) | branch `feat/v1`, commit `fa17f9b` |
| API (`tareg-backend`) | branch `feat/v1` |
| Files service (`tareg-files`) | branch `main` |
| Browser | Google Chrome, driven by a Playwright script (headless, 1440×900) |
| Database | Throwaway local Postgres 16 in Docker, both migrations applied, demo seed data |

- The Neon `production` database was not touched.
- Driver-app actions (readings, requests, breakdowns, accidents, violations, maintenance records) were submitted through the API, because the portal has no create buttons for them. Everything else was done by clicking through the portal.
- The portal ran with `NEXT_PUBLIC_FILES_BASE_URL=http://localhost:4100` set for the run. It is missing from the portal's `.env.local`, and without it attachments fail to load locally.

## Failures

| # | Scenario | What happens |
|---|---|---|
| 1 | Dashboard: 'Expired documents' card opens Compliance filtered to expired | Opens Compliance with no filter applied (25 of 52 rows shown). |
| 2 | Export: button produces a file | Clicking Export does nothing on any screen: the button has no click handler (ModulePage.tsx:235). |

## Observations

- **Handover odometer does not move the vehicle odometer.** An assignment ended at 1,750 km left the vehicle at 1,200 km, and the next driver's reading showed 1,200 km as "previous". The seeded assignments all start at 0 km. This matches the rule that only approved readings move the odometer; confirm it is intended.
- **Seed photos return 404.** The seeded kilometer readings reference photo paths that do not exist in the files service. Photos uploaded during the run loaded correctly.
- **Role deletion was not exercised.** No delete button was found on a role that is in use.

## Not tested

- Fuel Benefits, Reports and Notifications: still on mock data.
- The driver mobile app itself.
- The Docker deployment in `tareg-deploy`.
- Forgot password: parked.

## Results by area

| Area | Passed | Failed |
|---|---|---|
| Sign-in and session | 7 | 0 |
| Language, theme, navigation | 3 | 0 |
| Dashboard | 0 | 1 |
| Roles | 10 | 0 |
| Vehicles | 7 | 0 |
| Drivers | 5 | 0 |
| Assignments | 7 | 0 |
| Kilometer Tracking | 6 | 0 |
| Approvals | 9 | 0 |
| Maintenance | 5 | 0 |
| Expense Invoices | 2 | 0 |
| Breakdowns | 3 | 0 |
| Accidents | 2 | 0 |
| Violations | 1 | 0 |
| History | 2 | 0 |
| Compliance | 3 | 0 |
| Users | 5 | 0 |
| Settings | 5 | 0 |
| Export | 0 | 1 |
| Mobile width | 1 | 0 |
| Arabic | 1 | 0 |

## All scenarios

### Sign-in and session

| Result | Scenario | Detail |
|---|---|---|
| Pass | /dashboard without a session redirects to login |  |
| Pass | empty form shows a validation message | Please enter your email and password. |
| Pass | wrong password is refused with a message | Wrong email or password. |
| Pass | driver (mobile-only) login is refused on the portal | Driver accounts sign in through the Tareg mobile app. |
| Pass | Super Admin signs in and lands on the dashboard |  |
| Pass | session survives a page reload |  |
| Pass | logout returns to login and clears the session |  |

### Language, theme, navigation

| Result | Scenario | Detail |
|---|---|---|
| Pass | Arabic toggle switches to RTL and back |  |
| Pass | dark mode toggles and persists after reload |  |
| Pass | selected view persists across reload (?view=) |  |

### Dashboard

| Result | Scenario | Detail |
|---|---|---|
| **Fail** | 'Expired documents' card opens Compliance filtered to expired | Opens Compliance with no filter applied (25 of 52 rows shown). |

### Roles

| Result | Scenario | Detail |
|---|---|---|
| Pass | Fleet Manager signs in and sees only permitted screens |  |
| Pass | Assistant signs in and sees only permitted screens |  |
| Pass | HR signs in and sees only permitted screens |  |
| Pass | HR has no Assignments / Approvals / Users screens |  |
| Pass | Assistant cannot see Users & Roles or Settings |  |
| Pass | Assistant has view-only Vehicles (no Add / Edit) |  |
| Pass | HR can view accidents/violations but has no action buttons |  |
| Pass | create a custom role (view Vehicles + Drivers only) and sign in with it | Dashboard, Vehicles, Drivers |
| Pass | edit a custom role's permissions (add Compliance: View) and it takes effect | Dashboard,Vehicles,Drivers,Compliance & Expiries |
| Pass | built-in Super Admin role is locked | Dialog says the role is locked; Save is disabled. |

### Vehicles

| Result | Scenario | Detail |
|---|---|---|
| Pass | saving an empty form shows validation and does not save | Required |
| Pass | add a vehicle (E2E 9001) | EEA 9001 Toyota Corolla 2024 Riyadh Unassigned 1,200 km 15 Jul 2027 None None Active  |
| Pass | duplicate plate is refused | Add vehicle Another vehicle already has this plate number |
| Pass | search by plate / VIN and status filter |  |
| Pass | edit a vehicle (colour + status) and see it in the grid |  |
| Pass | deleting a vehicle that has a driver is refused | Edit vehicle End this vehicle's current assignment first |
| Pass | delete an unassigned vehicle | Asks 'Delete this record?' first. |

### Drivers

| Result | Scenario | Detail |
|---|---|---|
| Pass | National ID must start with 1 (validation) | A national ID starts with 1 |
| Pass | add a driver (E2E Tester, valid documents) | E2E Tester EMP-9001 +966500009001 National ID 1999999001 Saudi 15 Sept 2027 15 Sept 2027 No vehicle Active  |
| Pass | add a driver whose licence is already expired (E2E Expired) |  |
| Pass | duplicate phone / ID is refused | Refused by the server (409). |
| Pass | edit a driver (status → On leave → Active) |  |

### Assignments

| Result | Scenario | Detail |
|---|---|---|
| Pass | a vehicle that already has a driver cannot be assigned again | 2 vehicles offered |
| Pass | a driver with an expired licence cannot be assigned | Save disabled: 'This driver cannot be assigned: license expired' |
| Pass | assign EEA 9001 to E2E Tester with a handover odometer | ASG-0015 EEA 9001 Toyota Corolla E2E Tester EMP-9001 11 Nov 2026 Current 1,200 km - - End |
| Pass | Vehicles and Drivers grids show the new pairing |  |
| Pass | ending with an odometer below the start is refused | Save disabled |
| Pass | end the assignment; vehicle becomes unassigned | ASG-0015 EEA 9001 Toyota Corolla E2E Tester EMP-9001 11 Nov 2026 11 Nov 2026 1,200 km 1,750 km 550 km  |
| Pass | re-assign EEA 9001 to E2E Tester (kept for later flows) |  |

### Kilometer Tracking

| Result | Scenario | Detail |
|---|---|---|
| Pass | driver readings (app) appear In review with previous / distance |  |
| Pass | photo thumbnail loads and opens in a lightbox |  |
| Pass | Assistant approves KM-3319; vehicle odometer becomes 48,900 km |  |
| Pass | approving a reading below the odometer is refused with a message | This reading is below the vehicle's current odometer |
| Pass | Assistant rejects the low reading with a reason |  |
| Pass | approved/rejected readings have no further actions |  |

### Approvals

| Result | Scenario | Detail |
|---|---|---|
| Pass | Assistant sees the driver's request 'With the Assistant' |  |
| Pass | request detail dialog opens from the reference |  |
| Pass | Assistant approves APR-0001 → moves to the Fleet Manager |  |
| Pass | Assistant rejects a request with a reason; it is locked |  |
| Pass | rejecting without a reason is not allowed | confirm disabled until a reason is typed |
| Pass | Fleet Manager gives final approval on APR-0001 |  |
| Pass | Fleet Manager can approve directly, skipping the Assistant |  |
| Pass | Fleet Manager closes the approved request after the work |  |
| Pass | status filter and search by reference |  |

### Maintenance

| Result | Scenario | Detail |
|---|---|---|
| Pass | work on a request that is not approved is refused (API rule) | 422 REQUEST_NOT_APPROVED |
| Pass | driver's record for APR-0001 shows in the portal |  |
| Pass | Fleet Manager completes a job (MNT-0001) |  |
| Pass | next-service schedule shows the shop's next service for RJA 4821 |  |
| Pass | completing the last open job returns RJA 4821 to Active |  |

### Expense Invoices

| Result | Scenario | Detail |
|---|---|---|
| Pass | the maintenance invoices are listed with totals |  |
| Pass | totals reflect both jobs | Checked by direct inspection: Total spend SAR 2,320.50, 2 invoices. |

### Breakdowns

| Result | Scenario | Detail |
|---|---|---|
| Pass | driver's report is Open and marked Major, with a photo |  |
| Pass | Start → In progress | vehicle status while in progress: Broken down |
| Pass | Close → Closed |  |

### Accidents

| Result | Scenario | Detail |
|---|---|---|
| Pass | edit cost and notes on ACC-0001 |  |
| Pass | Start then Close |  |

### Violations

| Result | Scenario | Detail |
|---|---|---|
| Pass | Mark paid moves the fine from Unpaid to Paid | 1 Unpaid fines → 0 Unpaid fines |

### History

| Result | Scenario | Detail |
|---|---|---|
| Pass | RJA 4821 timeline lists today's reading, maintenance, breakdown, accident, violation |  |
| Pass | Driver tab shows Mohammed Al-Otaibi's events |  |

### Compliance

| Result | Scenario | Detail |
|---|---|---|
| Pass | Expired card filters the list; new expired licence is tracked | 5 expired documents |
| Pass | search by holder and paging |  |
| Pass | reminder badge follows the new Settings stages (14-day) | Checked by direct inspection: rows show the 14-day reminder after the Settings change. |

### Users

| Result | Scenario | Detail |
|---|---|---|
| Pass | add an Assistant user and sign in as them |  |
| Pass | short password and duplicate email are refused | Save disabled for a short password; 'Another user already has this email' |
| Pass | deactivated user can no longer sign in | This account is deactivated. Ask an administrator. |
| Pass | admin resets a password and reactivates; new password works |  |
| Pass | create a driver-app login linked to driver E2E Tester | New driver signed in by phone and submitted reading KM-3322 for EEA 9001; it appeared in Kilometer Tracking. |

### Settings

| Result | Scenario | Detail |
|---|---|---|
| Pass | change company details + reminder days, save, and reload | Settings saved |
| Pass | invalid email is refused | Save disabled |
| Pass | 'Minimum photos per reading = 2' makes the server refuse a 1-photo reading | 1 photo → 422 NOT_ENOUGH_PHOTOS; 2 photos → 201 |
| Pass | turning off 'Drivers can request maintenance' refuses requests but allows expense claims | battery → 422 MAINTENANCE_REQUESTS_DISABLED; expense claim → 201 |
| Pass | Assistant has no access to Settings via URL |  |

### Export

| Result | Scenario | Detail |
|---|---|---|
| **Fail** | button produces a file | Clicking Export does nothing on any screen: the button has no click handler (ModulePage.tsx:235). |

### Mobile width

| Result | Scenario | Detail |
|---|---|---|
| Pass | login + dashboard render without horizontal overflow |  |

### Arabic

| Result | Scenario | Detail |
|---|---|---|
| Pass | every live screen renders in Arabic with no page errors | 18 screens |
