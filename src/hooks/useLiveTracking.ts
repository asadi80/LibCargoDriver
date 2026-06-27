import { useEffect, useState } from "react";
import { socket } from "../services/socket";

export const useLiveTracking = (shipmentId: string | string[]) => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    socket.emit("shipment:join", shipmentId);

    socket.on("shipment:location", (data) => {
      setLocation(data);
    });

    return () => {
      socket.off("shipment:location");
    };
  }, [shipmentId]);

  return location;
};