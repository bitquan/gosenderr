// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  pickupLat?: number
  pickupLng?: number
  deliveryLat?: number
  deliveryLng?: number
  agreedFee?: number
  createdAt: any
  acceptedAt?: any
  completedAt?: any
  courierUid?: string
  import { Navigate, useParams } from "react-router-dom";

  export default function CourierJobDetailPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const redirectTo = jobId ? `/jobs/${jobId}` : "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }
                          ? 'text-green-700'
                          : step.status === 'current'
                          ? 'text-purple-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-sm text-gray-500 mt-1">{step.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📦</span>
              <span>Job Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Addresses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📍</span>
                  <span className="font-semibold text-green-800">Pickup</span>
                </div>
                <p className="text-gray-700 text-sm">{job.pickupAddress || 'Not provided'}</p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold text-red-800">Delivery</span>
                </div>
                <p className="text-gray-700 text-sm">{job.deliveryAddress || 'Not provided'}</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid md:grid-cols-2 gap-4">
              {job.vehicleType && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Vehicle Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{job.vehicleType}</p>
                </div>
              )}
              
              {job.recipientName && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recipient</p>
                  <p className="font-semibold text-gray-900">{job.recipientName}</p>
                </div>
              )}
              
              {job.recipientPhone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact</p>
                  <a href={`tel:${job.recipientPhone}`} className="font-semibold text-purple-600 hover:text-purple-700">
                    {job.recipientPhone}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Job ID</p>
                <p className="font-mono text-sm text-gray-900">{jobId}</p>
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Package Description</p>
                <p className="text-gray-900">{job.description}</p>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Special Instructions</p>
                <p className="text-gray-900">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
