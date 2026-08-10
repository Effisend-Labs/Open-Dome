import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fragment, useCallback, useContext, useEffect } from "react";
import { getAsyncStorageValue } from "../utilsApp/utils";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const { value, setValue } = useContext(ContextModule);
  const checkStarter = useCallback(async () => {
    if (value && value.starter) {
      return;
    }
    try {
      //await nukeStorage(); // for testing
      const nonSensitiveData = await getAsyncStorageValue("NONSENSITIVEDATA"); // Check if the app is started for the first time

      if (nonSensitiveData === null) {
        setValue({ starter: true });
        return;
      }

      const schema = await AsyncStorage.getItem("General");
      if (!schema) {
        console.log("No schema found, using default state");
        setValue({
          ...value,
          starter: true,
        });
        return;
      }

      const parsedSchema = JSON.parse(schema);
      const isConsistent =
        parsedSchema &&
        Object.keys(value).length ===
        Object.keys(parsedSchema).length;

      if (isConsistent) {
        console.log("Schema Match, using stored data"); // Avoiding data loss
        setValue({
          nonSensitiveData,
          starter: true,
        });
      } else {
        console.log("Schema Mismatch, using default data");
        setValue({
          ...value,
          starter: true,
        });
      }
    } catch (error) {
      console.error("🔴 CONTEXT LOADER BOOT ERROR:", error);
      setValue({
        ...value,
        starter: true,
      });
    }
  }, [setValue]);

  useEffect(() => {
    checkStarter();
  }, [checkStarter]);

  return <Fragment />;
}
