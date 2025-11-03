'use client';

import React, { useState, useEffect } from 'react';
import { ProctoringService, ProctoringAlert } from '../lib/proctoring-service';

interface ProctoringPanelProps {
  meetingId: string;
  isProctor: boolean;
}

export const ProctoringPanel: React.FC<ProctoringPanelProps> = ({ meetingId, isProctor }) => {
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  const [flaggedStudents, setFlaggedStudents] = useState<any[]>([]);
  const [proctoringService] = useState(new ProctoringService());

  useEffect(() => {
    if (isProctor) {
      loadAlerts();
      loadFlaggedStudents();
      
      // Poll for new alerts every 5 seconds
      const interval = setInterval(() => {
        loadAlerts();
        loadFlaggedStudents();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [meetingId, isProctor]);

  const loadAlerts = async () => {
    try {
      const alertsData = await proctoringService.getAlertsForMeeting(meetingId);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadFlaggedStudents = async () => {
    try {
      const flaggedData = await proctoringService.getFlaggedStudents(meetingId);
      setFlaggedStudents(flaggedData);
    } catch (error) {
      console.error('Failed to load flagged students:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await proctoringService.resolveAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'multiple_faces': return '👥';
      case 'no_face': return '❌';
      case 'phone_detected': return '📱';
      case 'face_mismatch': return '🚫';
      case 'suspicious_object': return '⚠️';
      default: return '🔍';
    }
  };

  if (!isProctor) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Proctoring Monitor</h3>
      
      {/* Flagged Students Summary */}
      {flaggedStudents.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">⚠️ Flagged Students ({flaggedStudents.length})</h4>
          {flaggedStudents.map((student, index) => (
            <div key={index} className="text-sm text-red-700">
              Student ID: {student.studentId} ({student.alertCount} alerts)
            </div>
          ))}
        </div>
      )}

      {/* Recent Alerts */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h4 className="font-medium text-gray-700 mb-2">Recent Alerts ({alerts.length})</h4>
        
        {alerts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <div className="text-2xl mb-2">✅</div>
            <p>No alerts detected</p>
          </div>
        ) : (
          alerts.slice(0, 10).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} ${
                alert.resolved ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getAlertIcon(alert.alertType)}</span>
                    <span className="font-medium text-sm">
                      {alert.alertType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                      {Math.round(alert.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm mb-1">{alert.message}</p>
                  <p className="text-xs opacity-75">
                    Student: {alert.studentId} • {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                {!alert.resolved && (
                  <button
                    onClick={() => resolveAlert(alert.id!)}
                    className="ml-2 px-2 py-1 text-xs bg-white bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};