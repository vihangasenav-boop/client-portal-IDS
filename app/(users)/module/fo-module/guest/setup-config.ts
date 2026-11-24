import type { GuestSetupConfig } from "./setup-types";

export const guestSetupConfigs: Record<
  GuestSetupConfig["entity"],
  GuestSetupConfig
> = {
  designation: {
    entity: "designation",
    title: "Designations",
    description: "Maintain property-specific hotel and guest designations.",
    templateName: "guest-designations",
    fields: [
      { key: "code", label: "Code", input: "text", required: true },
      { key: "name", label: "Name", input: "text", required: true },
      {
        key: "type",
        label: "Type",
        input: "select",
        required: true,
        options: [
          { label: "Hotel", value: "Hotel" },
          { label: "Guest", value: "Guest" },
        ],
      },
    ],
  },
  "document-type": {
    entity: "document-type",
    title: "Document Types",
    description: "Configure the document types accepted for guest profiles.",
    templateName: "guest-document-types",
    fields: [
      { key: "code", label: "Code", input: "text", required: true },
      { key: "name", label: "Name", input: "text", required: true },
      { key: "isDefault", label: "Is Default", input: "boolean" },
      { key: "isActive", label: "Is Active", input: "boolean" },
    ],
  },
  "dislike-type": {
    entity: "dislike-type",
    title: "Dislike Types",
    description: "Maintain guest dislike types and their display order.",
    templateName: "guest-dislike-types",
    fields: [
      { key: "code", label: "Code", input: "text", required: true },
      { key: "name", label: "Name", input: "text", required: true },
      {
        key: "displaySequence",
        label: "Display Sequence",
        input: "number",
      },
      { key: "isDefault", label: "Is Default", input: "boolean" },
      { key: "isActive", label: "Is Active", input: "boolean" },
    ],
  },
  "membership-class": {
    entity: "membership-class",
    title: "Membership Classes",
    description: "Create property-specific membership classes.",
    templateName: "guest-membership-classes",
    fields: [
      { key: "code", label: "Code", input: "text", required: true },
      { key: "name", label: "Name", input: "text", required: true },
    ],
  },
  "membership-type": {
    entity: "membership-type",
    title: "Membership Types",
    description: "Assign membership types to a membership class.",
    templateName: "guest-membership-types",
    fields: [
      {
        key: "membershipClassId",
        label: "Membership Class",
        importLabel: "Membership Class Code",
        input: "select",
        required: true,
      },
      { key: "code", label: "Code", input: "text", required: true },
      { key: "name", label: "Name", input: "text", required: true },
      {
        key: "displaySequence",
        label: "Display Sequence",
        input: "number",
      },
      { key: "isDefault", label: "Is Default", input: "boolean" },
    ],
  },
};
