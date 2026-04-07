# Asthma Dashboard

A real-time asthma risk assessment system that analyzes physiological and environmental sensor data to predict asthma attack risk levels.

## Features

- **Physiological Data Fusion**: Analyzes audio (cough/wheeze detection), SpO2 levels, and breathing patterns
- **Environmental Monitoring**: Tracks temperature, humidity, and PM2.5 air quality (coming soon)
- **Real-time Risk Assessment**: Weighted fusion algorithm for comprehensive risk scoring
- **Supabase Integration**: Cloud database for sensor data storage and retrieval
- **API Endpoints**: RESTful API for risk assessment

## Project Structure

```
Asthma_Dashboard/
├── api/
│   ├── index.py                    # Main Flask API with endpoints
│   ├── fusion_logic.py             # Physiological data fusion logic
│   └── environmental_fusion.py     # Environmental data fusion logic (WIP)
├── index.html                      # Frontend dashboard
├── requirements.txt                # Python dependencies
├── vercel.json                     # Vercel deployment config
└── .env.example                    # Environment variables template
```

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Asthma_Dashboard.git
cd Asthma_Dashboard
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### 4. Set Up Supabase Database

Run the following SQL in your Supabase SQL Editor to create the `sensor_data` table:

```sql
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id UUID PRIMARY KEY,
    device_id TEXT,
    created_at TIMESTAMPTZ,
    heart_rate FLOAT,
    spo2 FLOAT,
    accel_mag FLOAT,
    temperature FLOAT,
    humidity FLOAT,
    prediction_label TEXT,
    risk_level TEXT,
    remarks TEXT,
    uploaded_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT false,
    user_id TEXT,
    pm25 FLOAT,
    pm25_density FLOAT,
    pm25_raw FLOAT
);

ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sensor_data" 
ON public.sensor_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON public.sensor_data(created_at);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON public.sensor_data(device_id);
```

### 5. Run the Application

```bash
python api/index.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### POST `/api/assess-risk`

Fetches the latest sensor data and returns a risk assessment.

**Response:**
```json
{
    "final_risk": "SAFE",
    "risk_score": 0.42,
    "confidence": 0.85,
    "reasoning": "Weighted fusion score of 0.42 resulted in a SAFE risk assessment.",
    "individual_risks": {
        "audio": 0,
        "spo2": 0,
        "breathing": 1
    },
    "spo2_was_critical": false,
    "sensor_inputs": {
        "spo2": 96.5,
        "bpm": 38,
        "audio_risk": 0
    }
}
```

## Fusion Logic

### Physiological Fusion
- **Audio Risk**: Detects coughs and wheezes
- **SpO2 Monitoring**: Oxygen saturation levels
- **Breathing Rate**: Derived from accelerometer data
- **Weighted Algorithm**: SpO2 has highest weight (2.5), breathing (1.5), audio (1.0)
- **Safety Override**: Critical SpO2 (≤92%) triggers immediate HIGH risk

### Environmental Fusion (Coming Soon)
- Temperature monitoring
- Humidity tracking
- PM2.5 air quality assessment

## Deployment

This project is configured for deployment on Vercel. Push to your GitHub repository and connect it to Vercel.

Don't forget to add environment variables in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_KEY`

## Technologies Used

- **Backend**: Python, Flask
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Data Processing**: NumPy

## License

MIT License
