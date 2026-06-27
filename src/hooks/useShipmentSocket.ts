// FrontEnd/DriverApp/hooks/useShipmentSocket.ts
import { useEffect } from 'react';
import { socket } from '@/services/socket';
import { Alert } from 'react-native';

export const useShipmentSocket = () => {
  useEffect(() => {
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Listen for customer cancellation
    const onCustomerCancelled = (data: any) => {
      console.log('🚫 Customer cancelled shipment:', data);
      
      Alert.alert(
        'Shipment Cancelled',
        data.message || 'The customer has cancelled the shipment.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Refresh assigned shipments
              // router.push('/dashboard');
            }
          }
        ]
      );
    };

    socket.on('shipment-cancelled-by-customer', onCustomerCancelled);

    return () => {
      socket.off('shipment-cancelled-by-customer', onCustomerCancelled);
    };
  }, []);
};