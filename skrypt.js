let weatherChart = null;
const kluczApi = "1bff93dfd4d4b388a5d4ce8e01f54455";

const map = L.map('map').setView([52.237049, 21.017532], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const weatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${kluczApi}`, {
    attribution: 'Dane pogodowe: <a href="https://openweathermap.org/">OpenWeatherMap</a>'
});
weatherLayer.addTo(map);


let locationMarker = null;

document.getElementById("pokazPogode").addEventListener("click", function () {
    const miasto = document.getElementById("miasto").value;

    const weatherDiv = document.getElementById("pogoda");
    weatherDiv.style.display = 'none';

    if (!miasto) {
        alert("Proszę wprowadzić nazwę miasta.");
        return;
    }

    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${miasto}&appid=${kluczApi}&units=metric&lang=pl`;

    fetch(currentWeatherUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Nie znaleziono miasta.");
            }
            return response.json();
        })
        .then((data) => {
            weatherDiv.style.display = 'block';

            const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString("pl-PL");
            const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString("pl-PL");
            const dayLengthInSeconds = data.sys.sunset - data.sys.sunrise;
            const hours = Math.floor(dayLengthInSeconds / 3600);
            const minutes = Math.floor((dayLengthInSeconds % 3600) / 60);

            weatherDiv.innerHTML = `
                <div class="pogoda-info">
                    <div>
                        <h2>${data.name}, ${data.sys.country}</h2>
                        <p>Temperatura: ${Math.round(data.main.temp)}&#176;C</p>
                        <p>Temperatura odczuwalna: ${Math.round(data.main.feels_like)}&#176;C</p>
                        <p>Min: ${Math.round(data.main.temp_min)}&#176;C, Max: ${Math.round(data.main.temp_max)}&#176;C</p>
                    </div>
                    <div class="ikonka">
                        <img src="http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Ikona pogody">
                    </div>
                </div>
                <div class="pogoda-details">
                    <p>Opis: ${data.weather[0].description}</p>
                    <p>Wilgotność: ${data.main.humidity}%</p>
                    <p>Ciśnienie: ${data.main.pressure} hPa</p>
                    <p>Widoczność: ${data.visibility / 1000} km</p>
                    <p>Wiatr: ${data.wind.speed} m/s, Kierunek: ${data.wind.deg}°</p>
                    <p>Zachmurzenie: ${data.clouds.all}%</p>
                    <p>Wschód słońca: ${sunrise}</p>
                    <p>Zachód słońca: ${sunset}</p>
                    <p>Długość dnia: ${hours} godzin ${minutes} minut</p>
                </div>
            `;

            const lat = data.coord.lat;
            const lon = data.coord.lon;

            map.setView([lat, lon], 10);

            if (locationMarker) {
                locationMarker.setLatLng([lat, lon]);
                locationMarker.setPopupContent(data.name);
            } else {
                locationMarker = L.marker([lat, lon]).addTo(map);
                locationMarker.bindPopup(data.name).openPopup(); 
            }

            saveToHistory(data.name);

           
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${kluczApi}&units=metric&lang=pl`;

            return fetch(forecastUrl);
        })
        .then((response) => response.json())
        .then((forecastData) => {
            const chartDiv = document.getElementById("weatherChart");
            chartDiv.style.display = 'block';
            drawChart(forecastData);
        })
        .catch((error) => {
            alert(error.message);
        });
});

const history = [];
function saveToHistory(city) {
    if (!city) return;

    if (!history.includes(city)) {
        history.push(city);

        if (history.length > 5) {
            history.shift();
        }

        const historyList = document.getElementById("searchHistory");
        historyList.innerHTML = "";

        history.forEach((city) => {
            const li = document.createElement("li");
            li.textContent = city;
            li.style.marginRight = "10px";
            li.style.display = "inline-block";
            li.onclick = () => {
                document.getElementById("miasto").value = city;
                document.getElementById("pokazPogode").click();
            };
            historyList.appendChild(li);
        });

        const historyContainer = document.getElementById("historyContainer");
        if (historyContainer) {
            historyContainer.style.display = history.length > 0 ? 'block' : 'none';
        }
    }
}
function drawChart(data) {
    const ctx = document.getElementById("weatherChart").getContext("2d");

    if (weatherChart) {
        weatherChart.destroy();
    }

    const dayLabels = [];
    const dayTemps = [];

    data.list.forEach((entry) => {
        const entryDate = new Date(entry.dt_txt);
        const dayName = entryDate.toLocaleDateString("pl-PL", { weekday: 'long' });

        if (!dayLabels.includes(dayName)) {
            dayLabels.push(dayName);
            dayTemps.push(entry.main.temp);
        }
    });

    if (dayLabels.length === 0) {
        document.getElementById("pogoda").innerHTML += "<p>Brak pełnych danych do wyświetlenia wykresu.</p>";
        return;
    }

    weatherChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dayLabels,
            datasets: [
                {
                    label: "Średnia temperatura (°C)",
                    data: dayTemps,
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 14,
                        },
                    },
                },
                title: {
                    display: true,
                    text: "Prognoza temperatur na najbliższe dni",
                    font: {
                        size: 16,
                        weight: "bold",
                    },
                    padding: {
                        top: 10,
                        bottom: 30,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        stepSize: 1,
                        min: Math.min(...dayTemps) - 5,
                        max: Math.max(...dayTemps) + 5,
                    },
                },
            },
        },
    });
}

if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const geoUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${kluczApi}&units=metric&lang=pl`;

            fetch(geoUrl)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Nie udało się pobrać pogody dla Twojej lokalizacji.");
                    }
                    return response.json();
                })
                .then((data) => {
                    document.getElementById("miasto").value = data.name;
                    document.getElementById("pokazPogode").click();
                })
                .catch((error) => {
                    alert(`Błąd podczas pobierania pogody`);
                });
        },
        (error) => {
            alert(`Nie można uzyskać dostępu do lokalizacji`);
        }
    );
}
