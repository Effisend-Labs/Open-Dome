import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

export const useHOCS = (Component) => { // For Class Components to have access to hooks
  const getCurrentRoute = (navigation) => {
    const state = navigation.getState();
    const currentRoute = state.routes[state.index].name;
    return currentRoute;
  };

  const HOCSComponent = (props) => {
    const navigation = useNavigation();
    const route = getCurrentRoute(navigation);
    const glob = useGlobalSearchParams();
    const local = useLocalSearchParams();
    return (
      <Component
        glob={glob}
        local={local}
        navigation={navigation}
        route={route}
        {...props}
      />
    );
  };

  HOCSComponent.displayName = "HOCSComponent";

  return HOCSComponent;
};
