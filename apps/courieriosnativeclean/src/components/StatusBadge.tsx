import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {JOB_STATUS_LABELS, type JobStatus} from '../types/jobs';

const statusColors: Record<JobStatus, string> = {
  pending: '#f59e0b',
  accepted: '#2563eb',
  picked_up: '#7c3aed',
  delivered: '#16a34a',
  cancelled: '#dc2626',
};

export const StatusBadge = ({status}: {status: JobStatus}): React.JSX.Element => {
  return (
    <View style={[styles.badge, {backgroundColor: `${statusColors[status]}22`}]}>
      <Text style={[styles.label, {color: statusColors[status]}]}>{JOB_STATUS_LABELS[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
