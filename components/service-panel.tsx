"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Phone, MapPin, FileText, IndianRupee } from "lucide-react"

export function ServicePanel() {
  const services = [
    { name: "New Licence", fee: 500, time: "30 mins", docs: 4 },
    { name: "Renewal", fee: 200, time: "15 mins", docs: 3 },
    { name: "Replacement", fee: 300, time: "20 mins", docs: 3 },
    { name: "Address Change", fee: 100, time: "10 mins", docs: 3 },
    { name: "Driving Test", fee: 300, time: "45 mins", docs: 3 },
  ]

  return (
    <div className="space-y-4">
      {/* Quick Services */}
      <Card className="bg-black/20 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <div>
                <p className="text-white text-xs font-medium">{service.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-400 text-xs flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {service.time}
                  </span>
                  <span className="text-gray-400 text-xs flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    {service.docs} docs
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <IndianRupee className="w-3 h-3 mr-1" />
                {service.fee}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Office Info */}
      <Card className="bg-black/20 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Office Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-start space-x-2">
            <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
            <p className="text-gray-300">
              123 Government Complex
              <br />
              Main Road, City Center
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-gray-300">Mon-Sat: 9 AM - 5 PM</p>
          </div>

          <div className="flex items-center space-x-2">
            <Phone className="w-3 h-3 text-gray-400" />
            <p className="text-gray-300">1800-123-4567</p>
          </div>

          <div className="text-red-400 text-xs">Closed: Sundays & Holidays</div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-black/20 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-gray-300">
            <p>• Speak clearly and naturally</p>
            <p>• Auto-listen keeps conversation flowing</p>
            <p>• Say "repeat" if you missed something</p>
            <p>• Ask about documents or fees anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
