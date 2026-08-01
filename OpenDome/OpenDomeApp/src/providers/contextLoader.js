import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fragment, useContext, useEffect, useRef } from "react";
import { getAsyncStorageValue } from "../utilsApp/utils";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const context = useContext(ContextModule);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkStarter = async () => {
      const nonSensitiveData = await getAsyncStorageValue("NONSENSITIVEDATA");

      if (nonSensitiveData === null) {
        context.setValue({ starter: true });
        return;
      }

      const schema = await AsyncStorage.getItem("General");
      const parsedSchema = schema ? JSON.parse(schema) : {};
      
      const isConsistent =
        Object.keys(context.value).length === Object.keys(parsedSchema).length;

      if (isConsistent) {
        console.log("Schema Match, using stored data");
        context.setValue({
          nonSensitiveData,
          starter: true,
        });
      } else {
        console.log("Schema Mismatch, using default data");
        context.setValue({
          ...context.value,
          starter: true,
        });
      }
    };

    checkStarter();
  }, []); // Run exactly once on mount

  return <Fragment />;
}
