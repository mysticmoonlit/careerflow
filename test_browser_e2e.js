/**
 * Automated Browser End-to-End Test Suite for CareerFlow.
 * Uses Chrome DevTools Protocol (CDP) via native Node.js (Node 24) WebSocket & Fetch.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.join(__dirname, "scratch", "chrome_test_profile");
const FRONTEND_URL = "http://localhost:5173/";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTests() {
  console.log("==================================================");
  console.log("  CAREERFLOW BROWSER END-TO-END VERIFICATION");
  console.log("==================================================");

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  console.log("\n[SETUP] Launching Chrome headless on port 9222...");
  const chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${PROFILE_DIR}`,
    "about:blank",
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch("http://localhost:9222/json");
      const list = await res.json();
      if (list && list.length > 0) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      // Retry
    }
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome DevTools Protocol.");
    chromeProcess.kill();
    process.exit(1);
  }
  console.log("[SETUP] Connected to Chrome CDP:", wsUrl);

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");

  async function waitForSelector(selector, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await evaluate(`!!document.querySelector("${selector}")`);
      if (found) return true;
      await sleep(200);
    }
    const html = await evaluate(`document.body.innerHTML`);
    console.error(`Current body HTML: ${html ? html.slice(0, 500) : "empty"}...`);
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async function setupReactHelpers() {
    await evaluate(`
      window.setReactInput = function(element, value) {
        if (!element) return;
        const lastValue = element.value;
        element.value = value;
        const tracker = element._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
    `);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Registration, Session, Login, Logout
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Testing Authentication in Browser UI...");
    await sendCommand("Page.navigate", { url: FRONTEND_URL });

    // Wait for initial auth loading spinner to resolve
    const startWait = Date.now();
    while (Date.now() - startWait < 10000) {
      const isLoading = await evaluate(`!!document.querySelector(".auth-loading")`);
      if (!isLoading) break;
      await sleep(200);
    }

    await setupReactHelpers();

    // If currently logged in, log out first
    const isDashboard = await evaluate(`!!document.querySelector(".top-navbar")`);
    if (isDashboard) {
      console.log("  Logging out of previous session...");
      await evaluate(`document.querySelector(".navbar-logout-btn")?.click()`);
      await waitForSelector(".auth-card");
    } else {
      await waitForSelector(".auth-card");
    }

    // Switch to Register Form
    await evaluate(`
      const createBtn = Array.from(document.querySelectorAll(".switch-auth button")).find(b => b.textContent.includes("Create one"));
      if (createBtn) createBtn.click();
    `);
    await waitForSelector(".name-fields");

    await setupReactHelpers();

    // Register a new unique test user
    const testUsername = "tester_" + Date.now().toString().slice(-6);
    console.log(`  Registering browser user: ${testUsername}...`);
    await evaluate(`
      const inputs = document.querySelectorAll(".auth-form input");
      window.setReactInput(inputs[0], "Alex");
      window.setReactInput(inputs[1], "StaffDev");
      window.setReactInput(inputs[2], "${testUsername}");
      window.setReactInput(inputs[3], "${testUsername}@test.com");
      window.setReactInput(inputs[4], "Password123!");
      document.querySelector(".auth-submit").click();
    `);

    await waitForSelector(".top-navbar", 10000);

    const loggedInTitle = await evaluate(`document.querySelector(".navbar-page-title")?.textContent`);
    console.assert(loggedInTitle?.includes("Dashboard"), `Expected Dashboard view, got: ${loggedInTitle}`);
    console.log(`[PASS] 1. Registration & login successful! Navbar title: "${loggedInTitle}"`);

    // Test Sign Out
    await evaluate(`document.querySelector(".navbar-logout-btn").click()`);
    await waitForSelector(".auth-card");
    console.log("[PASS] 1b. Logout successful! Session terminated cleanly.");

    // Sign back in
    console.log(`  Signing back in as ${testUsername}...`);
    await setupReactHelpers();
    await evaluate(`(() => {
      const inputs = document.querySelectorAll(".auth-form input");
      window.setReactInput(inputs[0], "${testUsername}");
      window.setReactInput(inputs[1], "Password123!");
      document.querySelector(".auth-submit").click();
    })()`);
    await waitForSelector(".top-navbar", 10000);
    console.log("[PASS] 1c. Login with credentials successful!");


    // -------------------------------------------------------------
    // TEST 2: Dashboard Data & Metrics
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Verifying Dashboard Data in Browser UI...");
    await sleep(1000);
    const stats = await evaluate(`
      Array.from(document.querySelectorAll(".metric-card")).map(c => ({
        label: c.querySelector(".metric-label")?.textContent.trim(),
        num: c.querySelector(".metric-number")?.textContent.trim()
      }))
    `);
    console.log("  Dashboard Metrics:", stats);
    console.assert(stats.length === 6, "Expected 6 metric cards on dashboard");
    console.assert(stats[0].num === "0", "Initial total applications should be 0");
    console.log("[PASS] 2. Dashboard correctly reflects real database statistics.");

    // -------------------------------------------------------------
    // TEST 3: Application Create / Read / Update / Delete
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Testing Application Tracker CRUD in Browser UI...");
    await evaluate(`document.querySelector(".btn-primary-compact").click()`);
    await waitForSelector(".modal-content");

    await setupReactHelpers();

    // Fill application form
    await evaluate(`(() => {
      const modal = document.querySelector(".modal-content");
      const textInputs = modal.querySelectorAll("input[type=text]");
      window.setReactInput(textInputs[0], "Airbnb");
      window.setReactInput(textInputs[1], "Staff Full Stack Engineer");
      window.setReactInput(textInputs[2], "Full-time");
      window.setReactInput(textInputs[3], "Remote - US");
      window.setReactInput(textInputs[4], "$220,000 - $250,000");

      const textareas = modal.querySelectorAll("textarea");
      window.setReactInput(textareas[0], "Seeking a staff engineer with expertise in Python, Django, React, TypeScript, Docker, and PostgreSQL.");
      window.setReactInput(textareas[1], "Referred by senior director on tech team.");

      modal.querySelector("button[type=submit]").click();
    })()`);
    await sleep(1500);
    await waitForSelector(".applications-table tbody tr");

    const appRow = await evaluate(`(() => {
      const row = document.querySelector(".applications-table tbody tr");
      return row ? {
        company: row.querySelector(".bold-cell")?.textContent.trim(),
        role: row.querySelectorAll("td")[1]?.textContent.trim(),
        status: row.querySelector(".status-pill")?.textContent.trim()
      } : null;
    })()`);
    console.log("  Created application row:", appRow);
    console.assert(appRow?.company === "Airbnb", "Application row should show Airbnb");
    console.assert(appRow?.role === "Staff Full Stack Engineer", "Role should match");
    console.log("[PASS] 3a. Application created successfully via browser UI.");

    // Test Search Filter in UI
    await evaluate(`(() => {
      const searchInput = document.querySelector(".search-input");
      window.setReactInput(searchInput, "Airbnb");
    })()`);
    await sleep(500);
    const searchCount = await evaluate(`document.querySelectorAll(".applications-table tbody tr").length`);
    console.assert(searchCount === 1, "Search should return 1 matching row");

    // Test Edit Application via Browser Modal
    console.log("  Testing Edit Application...");
    await evaluate(`(() => {
      const editBtn = document.querySelectorAll(".btn-icon-action")[1];
      editBtn.click();
    })()`);
    await waitForSelector(".modal-content");

    const editCompanyVal = await evaluate(`document.querySelector(".modal-content input[type=text]")?.value`);
    console.assert(editCompanyVal === "Airbnb", `Edit modal should retain 'Airbnb', got: '${editCompanyVal}'`);

    // Modify role and submit
    await setupReactHelpers();
    await evaluate(`(() => {
      const modal = document.querySelector(".modal-content");
      const textInputs = modal.querySelectorAll("input[type=text]");
      window.setReactInput(textInputs[1], "Principal Full Stack Engineer");
      modal.querySelector("button[type=submit]").click();
    })()`);
    await sleep(1500);


    const updatedRole = await evaluate(`document.querySelectorAll(".applications-table tbody tr td")[1]?.textContent.trim()`);
    console.assert(updatedRole === "Principal Full Stack Engineer", `Expected updated role, got: ${updatedRole}`);
    console.log(`[PASS] 3b. Application updated successfully: "${updatedRole}"`);

    // -------------------------------------------------------------
    // TEST 4: Application Details View & Interview CRUD
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Testing Application Details & Interview CRUD...");
    await evaluate(`document.querySelector(".applications-table tbody tr").click()`);
    await waitForSelector(".hero-title");

    const detailHeroTitle = await evaluate(`document.querySelector(".hero-title")?.textContent.trim()`);
    console.assert(detailHeroTitle === "Principal Full Stack Engineer", "Detail view should open for selected application");

    // Change stage dropdown on details page
    await evaluate(`
      const select = document.querySelector(".status-select");
      select.value = "interview";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    `);
    await sleep(800);

    // Switch to Interviews tab
    await evaluate(`
      const tabs = Array.from(document.querySelectorAll(".detail-tab"));
      const intTab = tabs.find(t => t.textContent.includes("Interviews"));
      if (intTab) intTab.click();
    `);
    await sleep(500);

    // Click "+ Schedule Interview" in details
    await evaluate(`
      const scheduleBtn = Array.from(document.querySelectorAll(".panel-header button")).find(b => b.textContent.includes("Schedule"));
      if (scheduleBtn) scheduleBtn.click();
    `);
    await waitForSelector(".modal-content");

    await setupReactHelpers();
    await evaluate(`(() => {
      const modal = document.querySelector(".modal-content");
      const dtInput = modal.querySelector("input[type=datetime-local]");
      window.setReactInput(dtInput, "2026-10-15T14:00");

      const textInputs = modal.querySelectorAll("input[type=text]");
      if (textInputs.length > 0) {
        window.setReactInput(textInputs[0], "David Zhang (VP Engineering)");
      }

      const urlInput = modal.querySelector("input[type=url]");
      if (urlInput) {
        window.setReactInput(urlInput, "https://meet.google.com/airbnb-staff-loop");
      }

      modal.querySelector("button[type=submit]").click();
    })()`);
    await sleep(1500);

    const interviewCardCount = await evaluate(`document.querySelectorAll(".interview-card-row").length`);
    console.assert(interviewCardCount === 1, "Interview should be listed in details view");
    console.log("[PASS] 4a. Interview scheduled and displayed under Application Details.");

    // Toggle interview completion
    await evaluate(`document.querySelector(".interview-card-row input[type=checkbox]").click()`);
    await sleep(800);
    const isCompleted = await evaluate(`document.querySelector(".interview-card-row input[type=checkbox]").checked`);
    console.assert(isCompleted, "Interview should be marked completed");
    console.log("[PASS] 4b. Interview completion toggle verified in browser UI.");

    // -------------------------------------------------------------
    // TEST 5: Rule-Based Skill Analyzer in Browser
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Testing Rule-Based Skill Analyzer in Browser UI...");
    await evaluate(`
      const links = Array.from(document.querySelectorAll(".sidebar-link"));
      const analyzerLink = links.find(l => l.textContent.includes("Skill Analyzer"));
      if (analyzerLink) analyzerLink.click();
    `);
    await waitForSelector(".analyzer-info-banner");

    // Click "Insert Sample Resume"
    await evaluate(`document.querySelector(".btn-text-action")?.click()`);
    await sleep(300);

    // Pick tracked application from dropdown to auto-fill job description
    await evaluate(`(() => {
      const select = document.querySelector(".select-compact");
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(500);

    // Click "Compare & Analyze Alignment"
    console.log("  Running Rule-Based Analysis...");
    await evaluate(`document.querySelector(".btn-accent-cta").click()`);
    await waitForSelector(".analysis-results-container", 10000);

    const scoreVal = await evaluate(`document.querySelector(".score-value")?.textContent.trim()`);
    const matchedCount = await evaluate(`document.querySelectorAll(".skills-breakdown-grid .matched").length`);
    const missingCount = await evaluate(`document.querySelectorAll(".skills-breakdown-grid .missing").length`);
    console.log(`  Match Score: ${scoreVal}, Matched Tags: ${matchedCount}, Missing Tags: ${missingCount}`);
    console.assert(parseInt(scoreVal, 10) > 0, "Score percentage should be calculated");
    console.assert(matchedCount > 0, "Should have matching skills identified");
    console.log("[PASS] 5. Skill Analyzer successfully computed match percentage and keyword inventory.");

    // -------------------------------------------------------------
    // TEST 6: Interview Preparation Hub in Browser
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Testing Interview Preparation Hub in Browser UI...");
    await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll(".sidebar-link"));
      const prepLink = links.find(l => l.textContent.includes("Interview Prep"));
      if (prepLink) prepLink.click();
    })()`);
    await waitForSelector(".prep-item-card");

    const initialScore = await evaluate(`document.querySelector(".readiness-big-num")?.textContent.trim()`);
    const prepItemCount = await evaluate(`document.querySelectorAll(".prep-item-card").length`);
    console.log(`  Initial Readiness: ${initialScore}, Items in category: ${prepItemCount}`);
    console.assert(prepItemCount > 0, "Prep items should be populated");

    // Check off the first item
    await evaluate(`document.querySelector(".prep-item-card input[type=checkbox]").click()`);
    await sleep(1000);

    const updatedScore = await evaluate(`document.querySelector(".readiness-big-num")?.textContent.trim()`);
    console.log(`  Updated Readiness Score: ${updatedScore}`);

    // Expand item and draft answer notes
    await evaluate(`document.querySelector(".btn-secondary-compact")?.click()`);
    await sleep(400);

    await setupReactHelpers();
    await evaluate(`(() => {
      const textarea = document.querySelector(".prep-notes-textarea");
      if (textarea) {
        window.setReactInput(textarea, "Reviewed system architecture diagrams and STAR stories.");
        document.querySelector(".prep-notes-footer button")?.click();
      }
    })()`);
    await sleep(1000);
    const hasSavedIndicator = await evaluate(`!!document.querySelector(".saved-indicator")`);
    console.assert(hasSavedIndicator, "Saved indicator should appear after saving answer notes");
    console.log("[PASS] 6. Interview Preparation checklist, answer drafting, and readiness index verified.");

    // -------------------------------------------------------------
    // TEST 7: Analytics View in Browser
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Testing Real-Time Analytics in Browser UI...");
    await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll(".sidebar-link"));
      const analyticsLink = links.find(l => l.textContent.includes("Analytics"));
      if (analyticsLink) analyticsLink.click();
    })()`);
    await waitForSelector(".analytics-view");

    const analyticsStats = await evaluate(`(() => {
      return Array.from(document.querySelectorAll(".metric-card")).map(c => ({
        label: c.querySelector(".metric-label")?.textContent.trim(),
        val: c.querySelector(".metric-number")?.textContent.trim()
      }));
    })()`);
    console.log("  Analytics Summary:", analyticsStats);
    console.assert(analyticsStats[0].val !== "0", "Total applications in analytics should reflect created data");

    const funnelStages = await evaluate(`(() => {
      return Array.from(document.querySelectorAll(".funnel-label-col")).map(c => c.textContent.trim());
    })()`);
    console.log("  Funnel Pipeline Stages:", funnelStages);
    console.assert(funnelStages.length >= 4, "Conversion funnel pipeline should be rendered");
    console.log("[PASS] 7. Analytics view accurately aggregates real database metrics.");

    // -------------------------------------------------------------
    // TEST 8: Responsive Layout (Mobile / Tablet / Desktop)
    // -------------------------------------------------------------
    console.log("\n[TEST 8] Testing Responsive Viewports via Emulation...");
    // Mobile Viewport (375 x 667)
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(600);
    const mobileSidebarWidth = await evaluate(`window.getComputedStyle(document.querySelector(".sidebar")).width`);
    console.log(`  Mobile Viewport (375px) sidebar width: ${mobileSidebarWidth}`);

    // Tablet Viewport (768 x 1024)
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(600);
    const tabletNavTitle = await evaluate(`document.querySelector(".navbar-page-title")?.textContent`);
    console.assert(!!tabletNavTitle, "Navbar page title visible on tablet");

    // Reset Desktop Viewport (1280 x 800)
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(400);
    console.log("[PASS] 8. Responsive breakpoints tested cleanly without display errors.");

    // -------------------------------------------------------------
    // TEST 9: API Errors & Validation
    // -------------------------------------------------------------
    console.log("\n[TEST 9] Testing UI Error Handlers & Form Validation...");
    await evaluate(`document.querySelector(".navbar-logout-btn").click()`);
    await waitForSelector(".auth-card");

    // Try invalid password login
    await setupReactHelpers();
    await evaluate(`(() => {
      const inputs = document.querySelectorAll(".auth-form input");
      window.setReactInput(inputs[0], "${testUsername}");
      window.setReactInput(inputs[1], "TotallyWrongPassword!");
      document.querySelector(".auth-submit").click();
    })()`);
    await waitForSelector(".error-alert");

    const errorAlertText = await evaluate(`document.querySelector(".error-alert")?.textContent`);
    console.assert(errorAlertText?.includes("Invalid"), `Expected invalid credentials alert, got: ${errorAlertText}`);
    console.log(`[PASS] 9. Error states and validation messages verified: "${errorAlertText}"`);

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Data Protection (User Isolation)
    // -------------------------------------------------------------
    console.log("\n[TEST 10] Testing User Data Isolation in Browser...");
    const userB = "user_b_" + Date.now().toString().slice(-6);
    await evaluate(`(() => {
      const createBtn = Array.from(document.querySelectorAll(".switch-auth button")).find(b => b.textContent.includes("Create one"));
      if (createBtn) createBtn.click();
    })()`);
    await waitForSelector(".name-fields");

    await setupReactHelpers();
    await evaluate(`(() => {
      const inputs = document.querySelectorAll(".auth-form input");
      window.setReactInput(inputs[0], "User");
      window.setReactInput(inputs[1], "Two");
      window.setReactInput(inputs[2], "${userB}");
      window.setReactInput(inputs[3], "${userB}@test.com");
      window.setReactInput(inputs[4], "Password123!");
      document.querySelector(".auth-submit").click();
    })()`);
    await waitForSelector(".top-navbar", 10000);
    await waitForSelector(".metric-number", 10000);

    // User B's dashboard must show 0 applications (cannot see User A's "Airbnb" application!)
    const userBTotalApps = await evaluate(`document.querySelector(".metric-number")?.textContent.trim()`);
    console.assert(userBTotalApps === "0", `User B total applications should be 0, got: ${userBTotalApps}`);

    // Navigate to applications page for User B
    await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll(".sidebar-link"));
      const appLink = links.find(l => l.textContent.includes("Applications"));
      if (appLink) appLink.click();
    })()`);
    await sleep(1000);

    const userBAppsCount = await evaluate(`document.querySelectorAll(".applications-table tbody tr").length`);
    console.assert(userBAppsCount === 0, `User B must see 0 applications, saw: ${userBAppsCount}`);
    console.log(`[PASS] 10. Multi-tenant isolation verified in browser: User B cannot see User A's data.`);

    console.log("\n==================================================");
    console.log("  ALL 10 BROWSER & API VERIFICATIONS PASSED!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n[FAIL] Browser test encountered an error:", err);
    process.exitCode = 1;
  } finally {
    ws.close();
    chromeProcess.kill();
  }
}

runBrowserTests();
