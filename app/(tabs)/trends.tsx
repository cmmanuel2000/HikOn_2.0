import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TrendsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Health Trends & Analytics</Text>

      {/* Snapshot Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Avg SpO2</Text>
          <Text style={styles.value}>95.8%</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Asthma Events</Text>
          <Text style={styles.value}>2</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Avg Air Quality</Text>
          <Text style={styles.value}>12.0</Text>
        </View>
      </View>

      {/* Graph placeholders */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Physiological Vitals Trend</Text>
        <View style={styles.placeholderChart}>
          <Text style={styles.placeholderText}>[Vitals Line Context Area]</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Symptom Events</Text>
        <View style={styles.placeholderChart}>
          <Text style={styles.placeholderText}>[Symptoms Bar Chart Area]</Text>
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2a3b5c',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  smallCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#1a1a1a',
  },
  chartCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2a3b5c',
  },
  placeholderChart: {
    height: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  placeholderText: {
    color: '#aaa',
  },
});