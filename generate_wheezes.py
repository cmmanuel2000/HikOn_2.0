import os
import wave
import numpy as np

OUTPUT_DIR = "wheeze1_wav"
SAMPLE_RATE = 16000
DURATION = 3.0 # seconds

def generate_wheeze(filename, freq1, freq2, noise_level=0.05):
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), False)
    
    # Breathing envelope (fade in, hold, fade out) to simulate exhalation
    envelope = np.sin(np.pi * t / DURATION)
    
    # White noise (base breath sound)
    noise = np.random.normal(0, noise_level, len(t))
    
    # Wheeze component (narrowband sine waves)
    # Wheezes are typically 400Hz - 800Hz
    wheeze = 0.4 * np.sin(2 * np.pi * freq1 * t) + 0.3 * np.sin(2 * np.pi * freq2 * t)
    
    # Combine and apply envelope
    signal = (wheeze + noise) * envelope
    
    # Normalize to 16-bit range
    signal = signal / np.max(np.abs(signal))
    audio_data = np.int16(signal * 32767)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    with wave.open(filepath, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_data.tobytes())
        
    print(f"Generated {filepath}")

if __name__ == "__main__":
    print("Generating medical wheeze samples...")
    # Generate 5 different wheeze samples (varying frequencies)
    generate_wheeze("wheeze_low_pitch.wav", 350, 400)
    generate_wheeze("wheeze_mid_pitch.wav", 450, 600)
    generate_wheeze("wheeze_high_pitch.wav", 600, 850)
    generate_wheeze("wheeze_complex.wav", 380, 720)
    generate_wheeze("wheeze_harsh.wav", 500, 520, noise_level=0.1)
    
    print(f"Done! {len(os.listdir(OUTPUT_DIR))} files saved in '{OUTPUT_DIR}' folder.")
