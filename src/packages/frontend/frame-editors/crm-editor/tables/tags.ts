import { register } from "./tables";

register({
  name: "tags",

  title: "Tags",

  allowCreate: true,
  changes: true,

  query: {
    crm_tags: [
      {
        name: null,
        icon: null,
        color: null,
        description: null,
        last_edited: null,
        created: null,
        id: null,
      },
    ],
  },
});
