import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fragment, useCallback, useContext, useEffect } from "react";
import { getAsyncStorageValue } from "../utilsApp/utils";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const context = useContext(ContextModule);
  const checkStarter = useCallback(async () => {
    //await nukeStorage(); // for testing

    const nonSensitiveData = await getAsyncStorageValue("NONSENSITIVEDATA"); // Check if the app is started for the first time

    if (nonSensitiveData === null) {
      context.setValue({ starter: true });
      return;
    }

    const schema = await AsyncStorage.getItem("General");
    const isConsistent =
      Object.keys(context.value).length ===
      Object.keys(JSON.parse(schema)).length;

    if (isConsistent) {
      console.log("Schema Match, using stored data"); // Avoiding data loss
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
  }, [context]);

  useEffect(() => {
    checkStarter();
  }, [checkStarter]);

  return <Fragment />;
}
