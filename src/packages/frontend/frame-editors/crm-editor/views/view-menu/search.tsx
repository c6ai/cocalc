import { useMemo } from "react";
import { FilterOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, InputNumber, Select, Space } from "antd";
import type { ColumnsType } from "../../fields";
import { getFieldSpec } from "../../fields";
import { Icon } from "@cocalc/frontend/components";
import { plural } from "@cocalc/util/misc";
import { Operator, OPERATORS, AtomicSearch } from "../../syncdb/use-search";
import dayjs from "dayjs";
import { capitalize } from "@cocalc/util/misc";

function enumerate(x: object[]): any[] {
  const v: object[] = [];
  for (let n = 0; n < x.length; n++) {
    v.push({ ...x[n], n });
  }
  return v;
}

export default function searchMenu({ columns, search, setSearch, query }) {
  const dbtable = Object.keys(query)[0] as string;

  return {
    label:
      search.length == 0 ? (
        "Search"
      ) : (
        <span style={{ backgroundColor: "lightgreen", padding: "5px" }}>
          {search.length} Search {plural(search.length, "Field")}
        </span>
      ),
    key: "SubMenu",
    icon: <FilterOutlined />,
    children: enumerate(search)
      .map(({ n, field, operator, value }) => {
        return {
          disabled: true,
          label: (
            <SearchBy
              dbtable={dbtable}
              field={field}
              operator={operator}
              value={value}
              columns={columns}
              setSearch={setSearch}
              n={n}
            />
          ),
          key: `search-${n}`,
        };
      })
      .concat([
        {
          disabled: true,
          label: (
            <SearchBy
              dbtable={dbtable}
              n={search.length}
              columns={columns}
              setSearch={setSearch}
            />
          ),
          key: "search-add",
        },
      ]),
  };
}

interface SearchByProps {
  dbtable: string;
  field?: string; // if not set, then adding
  operator?: Operator;
  value?: string;
  columns: ColumnsType[];
  setSearch: (n: number, search: AtomicSearch | null) => void;
  n: number;
}

function SearchBy({
  dbtable,
  columns,
  field,
  operator,
  value,
  setSearch,
  n,
}: SearchByProps) {
  const fieldSpec = useMemo(
    () => (field ? getFieldSpec(dbtable, field) : {}),
    [dbtable, field]
  );

  return (
    <Space style={{ width: "100%" }}>
      <Select
        value={field ?? ""}
        size="small"
        style={{ width: "200px" }}
        showSearch
        placeholder="Find a field..."
        filterOption={(input, option) =>
          ((option?.label ?? "") as string)
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        onChange={(newField: string) => {
          setSearch(n, { field: newField, operator, value });
        }}
        optionFilterProp="children"
        options={columns.map(({ dataIndex, title }) => {
          return {
            value: dataIndex,
            label: title,
          };
        })}
      />
      {field && (
        <SelectOperator
          fieldSpec={fieldSpec}
          operator={operator}
          onChange={(operator) => {
            setSearch(n, { field, operator, value });
          }}
        />
      )}
      {field && operator && (
        <Value
          fieldSpec={fieldSpec}
          value={value}
          onChange={(value) => {
            setSearch(n, { field, operator, value });
          }}
        />
      )}
      <Button
        style={{ float: "right" }}
        type="link"
        onClick={() => setSearch(n, null)}
      >
        <Icon name="times" />
      </Button>
    </Space>
  );
}

function SelectOperator({ fieldSpec, operator, onChange }) {
  const options = useMemo(() => {
    if (fieldSpec.type == "boolean") {
      return [
        { value: "IS" as Operator, label: "IS" },
        { value: "IS NOT" as Operator, label: "IS NOT" },
      ];
    }
    return OPERATORS.filter((op) => op != "==").map((op: Operator) => {
      return { value: op, label: op };
    });
  }, [fieldSpec]);
  return (
    <Select
      size="small"
      style={{ width: "150px" }}
      value={operator}
      onChange={onChange}
      options={options}
    />
  );
}

// For field spec meaning, see packages/util/db-schema/types.ts
function Value({ fieldSpec, value, onChange }) {
  if (fieldSpec.type == "boolean") {
    return (
      <Select
        style={{ width: "100px" }}
        size="small"
        value={value}
        onChange={onChange}
        options={[
          { label: "True", value: "true" },
          { label: "False", value: "false" },
          { label: "NULL", value: "NULL" },
        ]}
      />
    );
  } else if (fieldSpec.type == "timestamp") {
    return (
      <DatePicker
        showTime
        defaultValue={dayjs(value)}
        onOk={(x) => onChange(x.toISOString())}
      />
    );
  } else if (fieldSpec.type == "number" || fieldSpec.type == "integer") {
    return (
      <InputNumber
        size="small"
        style={{ width: "100px" }}
        value={value}
        onChange={onChange}
        step={1}
      />
    );
  } else if (fieldSpec.type == "string" && fieldSpec.render?.type == "select") {
    return (
      <Select
        style={{ width: "100px" }}
        size="small"
        value={value}
        onChange={onChange}
        options={fieldSpec.render.options.map((value) => {
          return {
            label: capitalize(value),
            value,
          };
        })}
      />
    );
  } else {
    return (
      <Input
        size="small"
        style={{ width: "150px" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
}