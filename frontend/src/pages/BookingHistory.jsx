import React, { useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function BookingHistory() {
  const [bookings] = useState([
    {
      id: 'b1',
      groomerName: 'Sarah Jenkins',
      serviceTitle: 'Bath & Dry',
      petName: 'Max',
      date: '2026-05-20',
      time: '10:00 AM',
      status: 'confirmed',
      price: 45
    }
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">My Bookings</h1>
      
      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
          <Calendar className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">No bookings yet</h2>
          <p className="text-slate-500 mt-2">You haven't booked any grooming appointments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-slate-800">{booking.serviceTitle}</h3>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    {booking.status}
                  </span>
                </div>
                <p className="text-slate-600 mb-4">with <span className="font-semibold text-slate-800">{booking.groomerName}</span> for {booking.petName}</p>
                <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {booking.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</span>
                </div>
              </div>
              <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                <span className="text-2xl font-bold text-emerald-600">${booking.price}</span>
                <button className="mt-2 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors">
                  Cancel Booking
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
