define([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/Graphic",
  "esri/widgets/Expand",
  "esri/widgets/BasemapToggle",
  "esri/widgets/ScaleBar",
  "esri/widgets/Compass"
], function(Map, MapView, GeoJSONLayer, Graphic, Expand, BasemapToggle, ScaleBar, Compass) {
  
  // 🎨 Add clean, responsive CSS styles
  const modernStyles = document.createElement('style');
  modernStyles.textContent = `
    /* Clean Modern UI Styles */
    .modern-panel {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s ease;
    }
    
    .modern-panel:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
    
    /* Header */
    .header-container {
      position: absolute;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      z-index: 1000;
      text-align: center;
    }
    
    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
    }
    
    .header-subtitle {
      font-size: 11px;
      color: #7f8c8d;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Legend - Compact & Responsive */
    .legend-container {
      position: absolute;
      top: 80px;
      right: 15px;
      padding: 12px 16px;
      min-width: 160px;
      z-index: 1000;
    }
    
    .legend-title {
      font-size: 11px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 11px;
      color: #34495e;
    }
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }
    
    /* Stats - Compact */
    .stats-container {
      position: absolute;
      bottom: 60px;
      left: 15px;
      padding: 12px 16px;
      max-width: 280px;
      z-index: 1000;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    
    .stat-item {
      text-align: center;
      padding: 8px 6px;
      background: rgba(231, 76, 60, 0.08);
      border-radius: 8px;
      border: 1px solid rgba(231, 76, 60, 0.15);
    }
    
    .stat-number {
      font-size: 16px;
      font-weight: 700;
      color: #e74c3c;
      display: block;
      line-height: 1;
    }
    
    .stat-label {
      font-size: 9px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    
    .stat-highlight {
      grid-column: 1 / -1;
      margin-top: 8px;
      padding: 8px 10px;
      background: rgba(231, 76, 60, 0.12);
      border-radius: 8px;
      font-size: 10px;
      text-align: center;
    }
    
    .stat-highlight strong {
      color: #e74c3c;
      font-weight: 600;
    }
    
    /* Custom Popup - Small & Clean */
    .esri-popup__main-container {
      max-width: 280px !important;
      width: 280px !important;
    }
    
    .esri-popup__header {
      background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
      padding: 10px 12px !important;
    }
    
    .esri-popup__header-title {
      color: white !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }
    
    .esri-popup__content {
      padding: 12px !important;
    }
    
    .esri-popup__button {
      color: white !important;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .header-container {
        top: 10px;
        padding: 8px 16px;
      }
      
      .header-title {
        font-size: 14px;
      }
      
      .header-subtitle {
        font-size: 10px;
      }
      
      .legend-container,
      .stats-container {
        display: none;
      }
      
      .legend-container.mobile-show,
      .stats-container.mobile-show {
        display: block;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 2000;
      }
      
      .mobile-toggle {
        position: absolute;
        bottom: 15px;
        right: 15px;
        padding: 10px 16px;
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #e74c3c;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 1000;
      }
      
      .mobile-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1999;
      }
      
      .mobile-overlay.active {
        display: block;
      }
    }
    
    @media (max-width: 480px) {
      .esri-popup__main-container {
        max-width: 240px !important;
        width: 240px !important;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
    
    /* Quick Guide */
    .guide-container {
      position: absolute;
      top: 200px;
      right: 15px;
      padding: 12px 16px;
      max-width: 200px;
      z-index: 999;
      display: none;
    }
    
    .guide-container.visible {
      display: block;
    }
    
    .guide-text {
      font-size: 11px;
      line-height: 1.6;
      color: #34495e;
      margin: 8px 0 0 0;
    }
    
    .guide-text p {
      margin: 0 0 8px 0;
    }
    
    .guide-text strong {
      color: #e74c3c;
      font-weight: 600;
    }
    
    .info-button {
      position: absolute;
      top: 80px;
      right: 190px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      font-size: 16px;
      transition: all 0.2s ease;
    }
    
    .info-button:hover {
      background: #e74c3c;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
    }
    
    .info-button:hover::after {
      color: white;
    }
    
    .info-button::after {
      content: 'ℹ️';
    }
    
    @media (max-width: 768px) {
      .info-button {
        right: 15px;
      }
      
      .guide-container {
        right: 15px;
      }
    }
  `;
  document.head.appendChild(modernStyles);

  // 1️⃣ Create the base map
  const map = new Map({
    basemap: "gray-vector"
  });

  // 2️⃣ Create the view with responsive padding
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [122.9763, 10.8003],
    zoom: 12,
    padding: {
      left: 10,
      right: 190,
      top: 70,
      bottom: 80
    },
    popup: {
      dockEnabled: false,
      dockOptions: {
        buttonEnabled: false
      },
      collapseEnabled: false
    }
  });

  // 3️⃣ Add widgets
  const basemapToggle = new BasemapToggle({
    view: view,
    nextBasemap: "satellite"
  });
  view.ui.add(basemapToggle, "bottom-right");

  const scaleBar = new ScaleBar({
    view: view,
    unit: "metric"
  });
  view.ui.add(scaleBar, "bottom-left");

  const compass = new Compass({
    view: view
  });
  view.ui.add(compass, "top-left");

  // 4️⃣ Barangay data storage
  let barangays = [];

  // 5️⃣ Load Silay City Boundary
  fetch("/silay-boundary")
    .then(res => res.json())
    .then(geojson => {
      const blob = new Blob([JSON.stringify(geojson)], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const boundaryLayer = new GeoJSONLayer({
        url: url,
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [231, 76, 60, 0.05],
            outline: { 
              color: [231, 76, 60, 0.6], 
              width: 2,
              style: "dash"
            }
          }
        }
      });

      map.add(boundaryLayer);
    })
    .catch(err => console.error("Error loading boundary:", err));

  // 6️⃣ Function to add barangay markers
  function addBarangayMarkers(barangayData) {
    view.graphics.removeAll();
    
    barangayData.forEach(b => {
      const point = {
        type: "point",
        longitude: b.lon,
        latitude: b.lat
      };

      // Color coding
      let markerColor, markerSize, category;
      if (b.pwdCount >= 20) {
        markerColor = [231, 76, 60];
        markerSize = "14px";
        category = "High";
      } else if (b.pwdCount >= 10) {
        markerColor = [241, 196, 15];
        markerSize = "12px";
        category = "Medium";
      } else {
        markerColor = [46, 204, 113];
        markerSize = "10px";
        category = "Low";
      }

      const markerSymbol = {
        type: "simple-marker",
        color: markerColor,
        size: markerSize,
        outline: { 
          color: "white", 
          width: 2 
        },
        style: "circle"
      };

      const pwdPercentage = ((b.pwdCount / b.population) * 100).toFixed(1);

      // Compact disabilities HTML
      let disabilitiesHtml = '';
      if (b.disabilities && b.disabilities.length > 0) {
        disabilitiesHtml = `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
            <div style="font-size: 11px; font-weight: 600; color: #2c3e50; margin-bottom: 6px;">
              Disability Types
            </div>
            ${b.disabilities.map(disability => `
              <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 3px; border-left: 2px solid #e74c3c;">
                <span style="font-size: 10px; color: #34495e;">${disability.type}</span>
                <span style="font-size: 11px; font-weight: 700; color: #e74c3c;">${disability.count}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Compact popup content
      const popupContent = `
        <div style="font-family: -apple-system, sans-serif; padding: 4px;">
          
          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 8px;">
            <div style="text-align: center; padding: 6px; background: #ecf0f1; border-radius: 6px;">
              <strong style="font-size: 16px; color: #e74c3c;">${b.pwdCount}</strong>
              <div style="font-size: 9px; color: #7f8c8d;">PWDs</div>
            </div>
            <div style="text-align: center; padding: 6px; background: #ecf0f1; border-radius: 6px;">
              <strong style="font-size: 16px; color: #e74c3c;">${pwdPercentage}%</strong>
              <div style="font-size: 9px; color: #7f8c8d;">of Pop.</div>
            </div>
          </div>

          <!-- Gender -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 8px;">
            <div style="text-align: center; padding: 5px; background: #3498db; color: white; border-radius: 5px;">
              <strong style="font-size: 13px;">${b.maleCount}</strong>
              <span style="font-size: 9px;"> Male</span>
            </div>
            <div style="text-align: center; padding: 5px; background: #e91e63; color: white; border-radius: 5px;">
              <strong style="font-size: 13px;">${b.femaleCount}</strong>
              <span style="font-size: 9px;"> Female</span>
            </div>
          </div>

          <!-- Population -->
          <div style="padding: 5px; background: linear-gradient(90deg, #e74c3c, #c0392b); color: white; border-radius: 5px; text-align: center; font-size: 11px; margin-bottom: 8px;">
            <strong>Population: ${b.population.toLocaleString()}</strong>
          </div>

          ${disabilitiesHtml}

          <!-- Category -->
          <div style="margin-top: 8px; font-size: 10px; color: #7f8c8d; text-align: center;">
            <strong style="color: ${markerColor[0] === 231 ? '#e74c3c' : markerColor[0] === 241 ? '#f1c40f' : '#2ecc71'};">${category}</strong> PWD Concentration
          </div>
        </div>
      `;

      const pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol,
        attributes: { 
          name: b.name, 
          pwdCount: b.pwdCount,
          maleCount: b.maleCount,
          femaleCount: b.femaleCount,
          population: b.population,
          percentage: pwdPercentage,
          category: category
        },
        popupTemplate: {
          title: "{name}",
          content: popupContent
        }
      });

      view.graphics.add(pointGraphic);
    });
  }

  // 7️⃣ Header
  const headerContainer = document.createElement("div");
  headerContainer.className = "header-container modern-panel";
  headerContainer.innerHTML = `
    <h1 class="header-title">PWD Distribution Map</h1>
    <p class="header-subtitle">Silay City, Negros Occidental</p>
  `;
  view.container.appendChild(headerContainer);

  // 8️⃣ Compact Legend
  const legendContainer = document.createElement("div");
  legendContainer.className = "legend-container modern-panel";
  legendContainer.innerHTML = `
    <div class="legend-title">Pwd Concentration Levels</div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #e74c3c;"></div>
      <span>High (20+)</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #f1c40f;"></div>
      <span>Medium (10-19)</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #2ecc71;"></div>
      <span>Low (0-9)</span>
    </div>
  `;
  view.container.appendChild(legendContainer);

  // 8.5️⃣ Quick Guide with Toggle Button
  const infoButton = document.createElement("button");
  infoButton.className = "info-button";
  infoButton.title = "Quick Guide";
  
  const guideContainer = document.createElement("div");
  guideContainer.className = "guide-container modern-panel";
  guideContainer.innerHTML = `
    <div class="legend-title">Quick Guide</div>
    <div class="guide-text">
      <p><strong>Click</strong> markers to view PWD details</p>
      <p><strong>Zoom</strong> and pan to explore areas</p>
      <p><strong>Toggle</strong> basemap for satellite view</p>
      <p><strong>PWD data</strong> shows registered PWDs per barangay</p>
    </div>
  `;
  
  infoButton.addEventListener("click", () => {
    guideContainer.classList.toggle("visible");
  });
  
  // Close guide when clicking outside
  view.container.addEventListener("click", (e) => {
    if (!guideContainer.contains(e.target) && !infoButton.contains(e.target)) {
      guideContainer.classList.remove("visible");
    }
  });
  
  view.container.appendChild(infoButton);
  view.container.appendChild(guideContainer);

  // 9️⃣ Compact Statistics
  let statsContainer = document.createElement("div");
  statsContainer.className = "stats-container modern-panel";
  view.container.appendChild(statsContainer);

  function updateStatistics(barangayData) {
    const totalPwds = barangayData.reduce((sum, b) => sum + b.pwdCount, 0);
    const totalMales = barangayData.reduce((sum, b) => sum + b.maleCount, 0);
    const totalFemales = barangayData.reduce((sum, b) => sum + b.femaleCount, 0);
    const highestPwd = Math.max(...barangayData.map(b => b.pwdCount));
    const highestBarangay = barangayData.find(b => b.pwdCount === highestPwd).name;

    statsContainer.innerHTML = `
      <div class="legend-title">Statistics</div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">${totalPwds}</span>
          <div class="stat-label">Total PWDs</div>
        </div>
        <div class="stat-item">
          <span class="stat-number">${barangayData.length}</span>
          <div class="stat-label">Barangays</div>
        </div>
        <div class="stat-item">
          <span class="stat-number">${totalMales}</span>
          <div class="stat-label">Male</div>
        </div>
        <div class="stat-item">
          <span class="stat-number">${totalFemales}</span>
          <div class="stat-label">Female</div>
        </div>
        <div class="stat-highlight">
          Highest: <strong>${highestBarangay}</strong> (${highestPwd} PWDs)
        </div>
      </div>
    `;
  }

  // 🔟 Mobile toggle button
  if (window.innerWidth <= 768) {
    const mobileToggle = document.createElement("button");
    mobileToggle.className = "mobile-toggle";
    mobileToggle.textContent = "📊 Stats";
    
    const mobileOverlay = document.createElement("div");
    mobileOverlay.className = "mobile-overlay";
    
    mobileToggle.addEventListener("click", () => {
      statsContainer.classList.toggle("mobile-show");
      mobileOverlay.classList.toggle("active");
    });
    
    mobileOverlay.addEventListener("click", () => {
      statsContainer.classList.remove("mobile-show");
      mobileOverlay.classList.remove("active");
    });
    
    view.container.appendChild(mobileToggle);
    view.container.appendChild(mobileOverlay);
  }

  // 11️⃣ Load PWD data
  fetch("/pwd-map-data")
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        barangays = response.data;
        addBarangayMarkers(barangays);
        updateStatistics(barangays);
        console.log("✅ PWD data loaded successfully");
      } else {
        console.error("❌ Error loading PWD data:", response.message);
      }
    })
    .catch(err => console.error("❌ Error loading PWD data:", err));

  // 12️⃣ Responsive view padding
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      view.padding = { left: 10, right: 10, top: 60, bottom: 60 };
    } else {
      view.padding = { left: 10, right: 190, top: 70, bottom: 80 };
    }
  });

  view.when(() => {
    console.log("🗺️ Map loaded successfully!");
  });

});