import * as React from "react";

// Accordion components deprecated — replace with lightweight passthroughs to remove accordion behavior
const Accordion: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

const AccordionItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

const AccordionTrigger: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

const AccordionContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
