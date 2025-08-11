"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Phone, MapPin } from "lucide-react"

export function AppointmentPanel() {
  const officeInfo = {
    location: "123 Government Complex, Main Road, City Center",
    hours: "9 AM to 5 PM, Monday to Saturday",
    phone: "1800-123-4567",
    closed: "Sundays and public holidays",
  }

  const services = [
    { name: "New Licence", fee: "₹500", time: "30 mins" },
    { name: "Licence Renewal", fee: "₹200", time: "15 mins" },
    { name: "Replacement", fee: "₹300", time: "20 mins" },
    { name: "Address Change", fee: "₹100", time: "10 mins" },
    { name: "Driving Test", fee: "₹300", time: "45 mins" },
  ]

  return (
    <div className="space-y-6">
      {/* Office Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Office Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 mt-1 text-gray-500" />
            <p className="text-sm">{officeInfo.location}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <p className="text-sm">{officeInfo.hours}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <p className="text-sm">{officeInfo.phone}</p>
          </div>
          <div className="text-xs text-red-600">Closed: {officeInfo.closed}</div>
        </CardContent>
      </Card>

      {/* Services & Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Services & Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-gray-600">{service.time}</p>
                </div>
                <Badge variant="secondary">{service.fee}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
