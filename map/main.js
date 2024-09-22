let map;
let panels = [];  // Açılan tüm panelleri saklayacağımız bir dizi
const format = new ol.format.WKT();

window.onload = init;

function init() {
    // Harita başlatma
    map = new ol.Map({
        view: new ol.View({
            center: ol.proj.fromLonLat([35.2433, 38.9637]), // Türkiye koordinatları
            zoom: 6.5, // Başlangıç zoom seviyesi
        maxZoom: 12, // Maksimum zoom seviyesi
        minZoom: 6 
        }),
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM() // OpenStreetMap katmanı
            })
        ],
        target: 'js-map'
    });
    function loadMarkersOnMap() {
        // Fetch data from the API
        fetch('http://localhost:5026/api/Point/GetAll')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch markers.');
                }
                return response.json();
            })
            .then(data => {
                console.log("Fetched data:", data);  // Log the fetched data to check it's correct
    
                const vectorSource = new ol.source.Vector(); // Create a vector source
    
                data.forEach(item => {
                    const feature = format.readFeature(item.wkt, {
                        dataProjection: 'EPSG:3857',  // As the WKT is already in EPSG:3857
                        featureProjection: 'EPSG:3857' // Web Mercator projection for the map
                    });
                    feature.setId(item.id);
    
                    console.log("Feature created from WKT:", feature);  // Log each feature
    
                    // Define style based on geometry type with bluish colors
                    let style;
                    if (feature.getGeometry().getType() === 'Point') {
                        style = new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 5,
                                fill: new ol.style.Fill({ color: '#1E90FF' }),  // DodgerBlue color for Point
                                stroke: new ol.style.Stroke({ color: '#00008B', width: 2 })  // DarkBlue stroke
                            }),
                            text: new ol.style.Text({
                                font: '12px Calibri,sans-serif',
                                text: item.name,
                                fill: new ol.style.Fill({ color: '#1E90FF' }),  // DodgerBlue color for text
                                stroke: new ol.style.Stroke({ color: '#00008B', width: 3 }),  // DarkBlue stroke for text
                                offsetY: -15
                            })
                        });
                    } else if (feature.getGeometry().getType() === 'LineString') {
                        style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#1E90FF',  // DodgerBlue color for LineString
                                width: 4
                            }),
                            text: new ol.style.Text({
                                font: '12px Calibri,sans-serif',
                                text: item.name,
                                fill: new ol.style.Fill({ color: '#00008B' }),  // DarkBlue text color
                                stroke: new ol.style.Stroke({ color: '#1E90FF', width: 3 })  // DodgerBlue stroke for text
                            })
                        });
                    } else if (feature.getGeometry().getType() === 'Polygon') {
                        style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#1E90FF',  // DodgerBlue stroke for Polygon
                                width: 4
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(30, 144, 255, 0.3)'  // Semi-transparent DodgerBlue fill
                            }),
                            text: new ol.style.Text({
                                font: '12px Calibri,sans-serif',
                                text: item.name,
                                fill: new ol.style.Fill({ color: '#00008B' }),  // DarkBlue text color
                                stroke: new ol.style.Stroke({ color: '#1E90FF', width: 3 })  // DodgerBlue stroke for text
                            })
                        });
                    }
    
                    // Apply the style to the feature
                    feature.setStyle(style);
                    vectorSource.addFeature(feature); // Add feature to the vector source
                });
    
                // Add vector layer to the map
                const vectorLayer = new ol.layer.Vector({
                    source: vectorSource
                });
    
                map.addLayer(vectorLayer); // Add the vector layer to the map
            })
            .catch(error => {
                console.error('Error fetching markers:', error);  // Handle any errors
            });
    }
    
    // Call this function to load markers when the page loads
    loadMarkersOnMap();
    // Add Button'a basıldığında jsPanel açılmalı ve geometri tipi seçilmeli
    document.getElementById('addButton').addEventListener('click', function () {
        openPanel('Choose Geometry Type', `
            <button id="pointButton" class="draw-btn">Point</button>
            <button id="lineStringButton" class="draw-btn">LineString</button>
            <button id="polygonButton" class="draw-btn">Polygon</button>
        `, '400 200', function (panel) {
            // Point butonuna tıklayınca Point ekleme işlemi başlatılır
            document.getElementById('pointButton').addEventListener('click', function () {
                panel.close(); // Paneli kapatıyoruz
                activateDrawInteraction('Point');  // Point ekleme
            });

            // LineString butonuna tıklayınca LineString ekleme işlemi başlatılır
            document.getElementById('lineStringButton').addEventListener('click', function () {
                panel.close(); // Paneli kapatıyoruz
                activateDrawInteraction('LineString');  // LineString ekleme
            });

            // Polygon butonuna tıklayınca Polygon ekleme işlemi başlatılır
            document.getElementById('polygonButton').addEventListener('click', function () {
                panel.close(); // Paneli kapatıyoruz
                activateDrawInteraction('Polygon');  // Polygon ekleme
            });
        });
    });
}

// Belirtilen geometri türüne göre çizim işlemini başlatır
function activateDrawInteraction(geometryType) {
    const interaction = new ol.interaction.Draw({
        source: new ol.source.Vector(),
        type: geometryType
    });

    map.addInteraction(interaction);

    interaction.on('drawend', function (event) {
        const geometry = event.feature.getGeometry();  // Geometriyi alıyoruz
        const wkt = format.writeGeometry(geometry, {
            dataProjection: 'EPSG:4326'
        });

        // jsPanel oluşturma ve WKT formatında geometriyi gösterme
        openPanel('Add New ' + geometryType, `
            <form id="addGeometryForm">
                <label for="wkt">WKT Geometry:</label>
                <input type="text" id="wkt" name="wkt" value="${wkt}" readonly>
                <br>
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required>
                <br><br>
                <button type="submit" id="addGeometryButton">Save</button>
            </form>
        `, '400 200', function (panel) {
            document.getElementById('addGeometryForm').addEventListener('submit', function (event) {
                event.preventDefault();  // Sayfanın yenilenmesini engeller

                const wktValue = document.getElementById('wkt').value;
                const name = document.getElementById('name').value;

                const geometryData = {
                    wkt: wktValue,
                    name: name
                };

                // Backend'e POST isteği gönderme
                fetch('http://localhost:5026/api/Point/Add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(geometryData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();  // Yanıtı JSON olarak alıyoruz
                })
                .then(data => {
                    alert(geometryType + " added successfully!");
                    panel.close();  // Paneli kapat
                })
                .catch(error => {
                    alert("Error: " + error.message);
                    console.error('Error:', error);
                });
            });
        });

        // Interaction'ı kaldır
        map.removeInteraction(interaction);
    });
}

// Query Butonuna tıklandığında tablo oluşturma
document.getElementById('queryButton').addEventListener('click', function () {
    openPanel('Query Points', `
        <table id="pointsTable" border="1" cellpadding="10">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>WKT Geometry</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="pointsBody"></tbody>
        </table>
    `, '800 500', function (panel) {
        // Backend'deki GetAll metodunu çağır
        // Backend'deki GetAll metodunu çağır
fetch('http://localhost:5026/api/Point/GetAll')
.then(response => response.json())
.then(data => {
    const tableBody = document.getElementById('pointsBody');
    tableBody.innerHTML = ''; // Önce tabloyu temizle

    // Eğer API doğrudan veriyi döndürüyorsa data.value yerine data kullanın
    data.forEach(point => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${point.name}</td>
            <td>${point.wkt}</td>
            <td>
                <button class="show-btn" onclick="showPoint(${point.id}, '${point.wkt}')">Show</button>
                <button class="update-btn" onclick="updatePoint(${point.id})">Update</button>
                <button class="delete-btn" onclick="deletePoint(${point.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
})
.catch(error => {
    console.error('Error:', error);
});

    });
});

// Function to fetch the point data and open the update form panel
// Function to fetch the point data and open the options panel (Manual or Panel Update)
function updatePoint(id) {
    // Fetch the point by ID from the backend
    fetch(`http://localhost:5026/api/Point/GetById/${id}`)
        .then(response => response.json())
        .then(data => {
            const point = data;  // Store the fetched point data

            // Open a panel with options to either update manually or via panel
            openPanel('Update Options', `
                <p>Choose how you want to update the point:</p>
                <button id="manualUpdate" class="update-btn">Manual</button>
                <button id="panelUpdate" class="update-btn">Panel</button>
            `, '400 200', function (panel) {

                // If "Manual" is clicked, start the manual update
                document.getElementById('manualUpdate').addEventListener('click', function () {
                    closeAllPanels();  // Close any other open panels
                    enableManualDrag(point);  // Start manual dragging of the marker
                    zoomToWKT(point.wkt);  // Zoom to the marker's current location
                });

                // If "Panel" is clicked, open the panel update form
                document.getElementById('panelUpdate').addEventListener('click', function () {
                    closeAllPanels();  // Close any other open panels
                    openUpdatePanel(point);  // Open a form to manually update the WKT or name
                });
            });
        })
        .catch(error => {
            console.error('Error fetching point for update:', error);
        });
}

// Function to enable dragging (manual update) of a point or geometry on the map
// Function to enable dragging (manual update) of a point or geometry on the map
function enableManualDrag(point) {
    // Parse the current WKT into an OpenLayers feature
    const feature = format.readFeature(point.wkt, {
        dataProjection: 'EPSG:3857',   // WKT geometrinin projeksiyonu
        featureProjection: 'EPSG:3857' // Harita projeksiyonu
    });

    // Create a vector source and layer to hold the feature
    const vectorSource = new ol.source.Vector({
        features: [feature]
    });

    const vectorLayer = new ol.layer.Vector({
        source: vectorSource
    });

    // Add the layer to the map
    map.addLayer(vectorLayer);

    // Enable dragging for the feature
    const dragInteraction = new ol.interaction.Translate({
        features: new ol.Collection([feature])  // Sadece bu feature taşınabilir olacak
    });

    map.addInteraction(dragInteraction);  // Interaction'ı haritaya ekle

    // When the drag is finished, capture the new geometry and WKT
    dragInteraction.on('translateend', function (event) {
        const newGeometry = event.features.item(0).getGeometry();  // Yeni geometriyi al
        const newWKT = format.writeGeometry(newGeometry, {
            dataProjection: 'EPSG:3857'  // Yeni pozisyonu EPSG:4326 projeksiyonuna dönüştür
        });

        // Debug: Yeni WKT ve pozisyonu kontrol et
        console.log("New WKT after dragging:", newWKT);

        // Backend'e PUT isteği gönderme
        const updatedData = {
            wkt: newWKT,
            name: point.name  // Adı değişmeden bırakıyoruz (istersen düzenleyebilirsin)
        };

        fetch(`http://localhost:5026/api/Point/Update/${point.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update the point.');
            }
            return response.json();
        })
        .then(data => {
            alert("Point updated successfully!");
            map.removeInteraction(dragInteraction);  // Drag interaction'ı kaldır
        })
        .catch(error => {
            console.error('Error updating point:', error);
        });
    });
}
function openUpdatePanel(point) {
    openPanel('Update Point via Panel', `
        <form id="updatePointForm">
            <label for="wkt">WKT Geometry:</label>
            <input type="text" id="wkt" name="wkt" value="${point.wkt}">
            <br>
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" value="${point.name}">
            <br><br>
            <button type="submit" id="updatePointButton">Update</button>
        </form>
    `, '400 300', function (panel) {

        // Form submit olayını dinle
        document.getElementById('updatePointForm').addEventListener('submit', function (event) {
            event.preventDefault();  // Sayfanın yenilenmesini engeller
            
            // Formdan alınan verileri kontrol et
            const updatedWKT = document.getElementById('wkt').value;
            const updatedName = document.getElementById('name').value;

            console.log("Updated WKT:", updatedWKT);  // WKT kontrolü
            console.log("Updated Name:", updatedName);  // İsim kontrolü

            const updatedData = {
                wkt: updatedWKT,
                name: updatedName
            };

            // Backend'e PUT isteği gönder
            fetch(`http://localhost:5026/api/Point/Update/${point.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update the point.');
                }
                return response.json();
            })
            .then(data => {
                alert("Point updated successfully!");
                panel.close();  // Paneli başarıyla kapat
            })
            .catch(error => {
                alert("Error: " + error.message);
                console.error('Error updating point:', error);
            });
        });
    });
}


function deletePoint(id) {
    // Open a jsPanel for delete confirmation
    jsPanel.create({
        headerTitle: 'Confirmation',
        content: `
            <p>Are you sure you want to delete this point?</p>
            <button id="confirmDelete" class="delete-btn">Yes</button>
            <button id="cancelDelete" class="cancel-btn">No</button>
        `,
        contentSize: '400 200',
        callback: function (panel) {
            // If "Yes" is clicked
            document.getElementById('confirmDelete').addEventListener('click', function () {
                // Send DELETE request to the API
                fetch(`http://localhost:5026/api/Point/Delete/${id}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to delete the point.');
                    }
                    return response.json();
                })
                .then(data => {
                    alert('Point successfully deleted!');
                    panel.close(); // Close the panel
                    // You can update the map or take other actions here
                })
                .catch(error => {
                    console.error('Delete error:', error);
                });
            });

            // If "No" is clicked
            document.getElementById('cancelDelete').addEventListener('click', function () {
                panel.close(); // Close the panel without deleting
            });
        }
    });
}
// Function to zoom to WKT geometry on the map with specific settings for each geometry type
function zoomToWKT(wkt) {
    try {
        // Parse the WKT into a feature with proper projections
        const feature = format.readFeature(wkt, {
            dataProjection: 'EPSG:3857',    // WKT geometrinin projeksiyonu (genellikle EPSG:4326)
            featureProjection: 'EPSG:3857'  // Haritanın projeksiyonu (EPSG:3857)
        });

        // Get the geometry from the feature
        const geometry = feature.getGeometry();
        const geometryType = geometry.getType();

        if (geometryType === 'Point') {
            // Handle Point geometries (nokta)
            const coordinates = geometry.getCoordinates();
            
            // Noktaya odaklan, zoom seviyesi 12 ile yakınlaştır
            map.getView().animate({
                center: coordinates,
                zoom: 12,              // Noktaya hafif bir yakınlaştırma
                duration: 1000         // 1 saniyelik animasyon
            });
            console.log("Zooming to Point coordinates:", coordinates);

        } else if (geometryType === 'LineString') {
            // Handle LineString geometries (çizgi)
            const extent = geometry.getExtent();  // Çizginin extent'ini al
            map.getView().fit(extent, {
                duration: 1000,           // Animasyon süresi
                maxZoom: 10,              // Çizgiler için maksimum zoom seviyesi
                padding: [50, 50, 50, 50] // Etrafına boşluk bırakmak için padding
            });
            console.log("Zooming to LineString extent:", extent);

        } else if (geometryType === 'Polygon') {
            // Handle Polygon geometries (poligon)
            const extent = geometry.getExtent();  // Poligonun extent'ini al
            map.getView().fit(extent, {
                duration: 1000,           // Animasyon süresi
                maxZoom: 9,               // Poligonlar için maksimum zoom seviyesi
                padding: [50, 50, 50, 50] // Etrafına boşluk bırakmak için padding
            });
            console.log("Zooming to Polygon extent:", extent);
        }

    } catch (error) {
        console.error("Error zooming to WKT:", error);
    }
}

// Trigger the zoom function when "Show" button is clicked
function showPoint(id, wkt) {
    console.log("Showing point with ID:", id, "WKT:", wkt);  // Log point details
    zoomToWKT(wkt);  // Call the zoom function
}


// Panel açarken panel referansını saklama
function openPanel(headerTitle, content, size, callback) {
    const panel = jsPanel.create({
        headerTitle: headerTitle,
        content: content,
        position: 'center',
        contentSize: size,  // Her panel için farklı bir boyut belirleniyor
        callback: callback
    });

    // Açılan paneli panels dizisine ekliyoruz
    panels.push(panel);
}

// Tüm açık panelleri kapatma fonksiyonu
function closeAllPanels() {
    panels.forEach(panel => {
        panel.close();
    });
    panels = [];
}
