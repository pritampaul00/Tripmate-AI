export interface Flight {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: string;
  duration?: number;
  travelClass?: string;
  fareType?: string;
  stops?: number;
  emissions?: string;
  bookingUrl?: string;
  checkedAt?: string;
}


