import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Physical Status</Text>
      
      {/* Vitals Section */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.label}>SpO2</Text>
            <Text style={styles.value}>91.8<Text style={styles.unit}>%</Text></Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>Heart Rate</Text>
            <Text style={styles.value}>35<Text style={styles.unit}>bpm</Text></Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>Breathing</Text>
            <Text style={styles.value}>12<Text style={styles.unit}>br/m</Text></Text>
          </View>
        </View>
        <Text style={styles.warningText}>CRITICAL OVERRIDE: SpO2 at or below 92% triggered safety protocol.</Text>
      </View>

      {/* Surroundings Section */}
      <Text style={styles.header}>Surroundings</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.label}>Temp Index</Text>
            <Text style={styles.value}>N/A</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>Humidity</Text>
            <Text style={styles.value}>N/A</Text>
          </View>
        </View>
        <View style={[styles.row, { marginTop: 15 }]}>
          <View style={styles.statBox}>
            <Text style={styles.label}>PM2.5</Text>
            <Text style={styles.value}>N/A</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>AQI</Text>
            <Text style={styles.value}>N/A</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f4f8',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    color: '#2a3b5c',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  unit: {
    fontSize: 14,
    color: '#888',
  },
  warningText: {
    marginTop: 20,
    color: '#d9534f',
    fontSize: 14,
    fontWeight: '500',
  }
});