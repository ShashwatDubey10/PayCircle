import React, { createContext, useContext, useState } from 'react';

const BadgeCtx = createContext({ splitBadge: 0, setSplitBadge: () => {} });

export function BadgeProvider({ children }) {
  const [splitBadge, setSplitBadge] = useState(0);
  return (
    <BadgeCtx.Provider value={{ splitBadge, setSplitBadge }}>
      {children}
    </BadgeCtx.Provider>
  );
}

export const useBadge = () => useContext(BadgeCtx);
