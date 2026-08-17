import { Redirect } from "expo-router";
export default function ScanTab(){return <Redirect href={{ pathname: "/scan/camera", params: { newSession: "1" } }}/>}
