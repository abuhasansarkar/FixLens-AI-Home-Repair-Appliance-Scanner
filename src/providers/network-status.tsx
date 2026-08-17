import NetInfo from "@react-native-community/netinfo";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const NetworkContext = createContext({ offline: false, known: false });
export function NetworkStatusProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState({ offline: false, known: false });
  useEffect(() => NetInfo.addEventListener((network) => setState({ offline: network.isConnected === false || network.isInternetReachable === false, known: network.isConnected !== null })), []);
  const value = useMemo(() => state, [state]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
export function useNetworkStatus() { return useContext(NetworkContext); }
