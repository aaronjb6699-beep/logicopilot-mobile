import React, { createContext, useContext, useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

interface NetworkContextType {
  isOnline: boolean;
  isConnected: boolean | null;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, isConnected: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NetworkContextType>({ isOnline: true, isConnected: true });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isOnline: netState.isConnected === true && netState.isInternetReachable !== false,
        isConnected: netState.isConnected,
      });
    });
    return unsubscribe;
  }, []);

  return <NetworkContext.Provider value={state}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext);
}
