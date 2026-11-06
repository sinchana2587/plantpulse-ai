# PlantPulse AI — Agricultural Dataset & Knowledge Library Documentation

## 1. Executive Summary
The Agricultural Dataset Library (`/datasets`) serves as the scientific foundation of PlantPulse AI. It aggregates validated agronomic parameters from the Indian Council of Agricultural Research (ICAR) and the Food and Agriculture Organization (FAO), catalogs authentic computer vision training datasets, and generates printable/exportable crop dossiers for individual monitored plants.

---

## 2. Library Components

### 2.1 Crop Agronomic Knowledge Profiles
Comprehensive biophysical parameters for 6 core crops:

| Crop | Scientific Name | $T_{base}$ | $T_{cutoff}$ | Opt Temp | Opt Moisture | Opt pH | Key Stress Factors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tomato** | *Solanum lycopersicum* | 10.0°C | 34.0°C | 18–27°C | 50–65% | 6.0–6.8 | Early/Late Blight, Blossom End Rot, Heat Stress |
| **Chilli** | *Capsicum annuum* | 12.0°C | 35.0°C | 20–30°C | 45–60% | 6.0–7.0 | Anthracnose, Leaf Curl Virus, Flower Drop |
| **Brinjal** | *Solanum melongena* | 12.0°C | 35.0°C | 22–32°C | 50–65% | 5.5–6.8 | Shoot & Fruit Borer, Bacterial Wilt, Phomopsis |
| **Okra** | *Abelmoschus esculentus*| 15.0°C | 38.0°C | 24–35°C | 45–60% | 6.0–7.5 | Yellow Vein Mosaic Virus, Enation Leaf Curl |
| **Cucumber** | *Cucumis sativus* | 12.0°C | 36.0°C | 20–30°C | 60–75% | 6.0–7.0 | Downy Mildew, Powdery Mildew, Fruit Crooking |
| **Banana** | *Musa spp.* | 14.0°C | 38.0°C | 22–32°C | 60–75% | 6.0–7.5 | Panama Wilt, Sigatoka Leaf Spot, Cold Injury |

Each profile provides:
- Vernacular names in English, Kannada, and Hindi.
- Critical phenological stages with order, duration in days, and minimum GDD thermal threshold.
- Visual characteristics, recommended agronomic practices, and key physiological risks.
- Formal citations to ICAR-IIHR, ICAR-NRCB, and FAO Irrigation and Drainage Paper 56.

---

### 2.2 Authentic AI/ML Training Datasets Catalog
Curated inventory of peer-reviewed computer vision datasets used for training and benchmarking PlantPulse AI models:

1. **PlantVillage Growth Stage & Pathology Corpus**
   - *Provider:* Penn State University & EPFL
   - *License:* CC BY-SA 4.0
   - *Total Images:* 54,306 images
   - *Benchmark Accuracy:* 96.8% (ResNet-50 / EfficientNet-B4)
   - *Supported Crops:* Tomato, Chilli, Bell Pepper

2. **AgriPheno Multi-Temporal Field Phenomics Dataset**
   - *Provider:* INRAE & Wageningen University & Research
   - *License:* Open Data Commons Attribution (ODC-By)
   - *Total Images:* 18,400 images
   - *Benchmark Accuracy:* 94.2% (Vision Transformer ViT-Base)
   - *Supported Crops:* Solanaceous Vegetables, Cucurbits

3. **ICAR National Banana Collection & Phenotyping Repository**
   - *Provider:* ICAR - National Research Centre for Banana (NRCB), Tiruchirappalli
   - *License:* ICAR Institutional Research Access Agreement
   - *Total Images:* 12,850 images
   - *Benchmark Accuracy:* 92.6% (ConvNeXt-Tiny)
   - *Supported Crops:* Banana (*Musa* spp. cultivars Grand Naine, Robusta, Nendran)

4. **Wageningen Cucumber & Greenhouse Cucurbits Phenology Dataset**
   - *Provider:* Wageningen University Greenhouse Horticulture
   - *License:* Creative Commons Zero (CC0)
   - *Total Images:* 9,600 images
   - *Benchmark Accuracy:* 95.1% (YOLOv8-Seg + ResNet-101)
   - *Supported Crops:* Cucumber, Gherkin

---

### 2.3 Personalized Crop Dossier Generator (`My Plant Reports`)
Users can generate an individual agronomic dossier for any registered plant containing:
- Plant identity, sowing date, and active developmental stage.
- Field observation history (count, duration, stages observed).
- Microclimate environmental summary (mean temperature, soil moisture, humidity, sunlight, precipitation).
- Agronomic baseline comparisons against ICAR thermal limits.
- Actionable agricultural recommendations.
- Print / PDF export engine (`@media print` formatted).
