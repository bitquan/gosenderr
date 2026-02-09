import React from "react";

export type SlotName =
  | "topLeft"
  | "topRight"
  | "center"
  | "bottom"
  | "bottomRight";

type SlotsMap = Record<SlotName, React.ReactNode | null>;

const defaultSlots: SlotsMap = {
  topLeft: null,
  topRight: null,
  center: null,
  bottom: null,
  bottomRight: null,
};

const SlotContext = React.createContext<{
  slots: SlotsMap;
  register: (name: SlotName, node: React.ReactNode | null) => void;
}>({
  slots: defaultSlots,
  register: () => {},
});

export const MapShellSlotsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [slots, setSlots] = React.useState<SlotsMap>(defaultSlots);
  const register = React.useCallback(
    (name: SlotName, node: React.ReactNode | null) => {
      setSlots((prev) => ({ ...prev, [name]: node }));
    },
    [],
  );

  return (
    <SlotContext.Provider value={{ slots, register }}>
      {children}
    </SlotContext.Provider>
  );
};

export const Slot = ({
  name,
  children,
}: {
  name: SlotName;
  children?: React.ReactNode;
}) => {
  const { register } = React.useContext(SlotContext);
  React.useEffect(() => {
    register(name, children ?? null);
    return () => register(name, null);
  }, [name, children, register]);
  return null;
};

export const useSlots = () => React.useContext(SlotContext);
