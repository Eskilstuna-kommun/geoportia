import React from 'react';
import { useMainGeoDatasetStyles } from './styles';

export const StatusBadge = ({
  status,
}: {
  status: 'error' | 'warning' | 'success';
}) => {
  const classes = useMainGeoDatasetStyles();
  const statusClass = {
    error: classes.statusError,
    warning: classes.statusWarning,
    success: classes.statusSuccess,
  }[status];
  const icon = status === 'success' ? '✓' : '!';
  return (
    <span className={`${classes.statusBadge} ${statusClass}`}>{icon}</span>
  );
};

export const ShieldIcon = ({
  level,
}: {
  level: 'green' | 'yellow' | 'red';
}) => {
  const classes = useMainGeoDatasetStyles();
  const colorClass = {
    green: classes.shieldGreen,
    yellow: classes.shieldYellow,
    red: classes.shieldRed,
  }[level];
  return <span className={`${classes.shieldIcon} ${colorClass}`}>🛡️</span>;
};
