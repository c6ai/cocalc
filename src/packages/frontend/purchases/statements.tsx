import { Alert, Spin, Table } from "antd";
import ShowError from "@cocalc/frontend/components/error";
import Refresh from "@cocalc/frontend/components/refresh";
import { getStatements } from "./api";
import { useEffect, useState } from "react";
import type { Interval, Statement } from "@cocalc/util/db-schema/statements";
import { currency } from "./util";
import { TimeAgo } from "@cocalc/frontend/components/time-ago";
import { PurchasesTable } from "./purchases";

interface Props {
  interval: Interval;
  limit?: number;
  noRefresh?: boolean;
  defaultExpandAllRows?: boolean;
}

export default function Statements({
  interval,
  limit,
  noRefresh,
  defaultExpandAllRows,
}: Props) {
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [error, setError] = useState<any>("");
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setStatements(await getStatements({ interval, limit }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Cutoff Time",
      dataIndex: "time",
      key: "time",
      render: (time) => <TimeAgo date={time} />,
    },
    {
      title: "Total Charges",
      dataIndex: "total_charges",
      key: "total_charges",
      align: "right" as "right",
      render: (total) => currency(total, 2),
    },
    {
      title: "Charges",
      align: "center" as "center",
      dataIndex: "num_charges",
      key: "num_charges",
    },
    {
      title: "Total Credits",
      dataIndex: "total_credits",
      key: "total_credits",
      align: "right" as "right",
      render: (total) => currency(total, 2),
    },
    {
      title: "Credits",
      align: "center" as "center",
      dataIndex: "num_credits",
      key: "num_credits",
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      align: "right" as "right",
      render: (balance) => currency(balance, 2),
    },
  ];

  if (loading) {
    return <Spin />;
  }
  return (
    <div style={{ minHeight: "50px" }}>
      {!noRefresh && (
        <Refresh
          refresh={refresh}
          style={{ float: "right", marginBottom: "8px", marginLeft: "15px" }}
        />
      )}
      <ShowError error={error} setError={setError} />
      {statements != null && statements?.length > 0 && (
        <Table
          rowKey="id"
          style={{ marginTop: "8px" }}
          dataSource={statements}
          columns={columns}
          pagination={{ hideOnSinglePage: true, defaultPageSize: 30 }}
          defaultExpandAllRows={defaultExpandAllRows}
          expandable={{
            expandedRowRender: (record) => {
              return (
                <PurchasesTable
                  day_statement_id={interval == "day" ? record.id : undefined}
                  month_statement_id={
                    interval == "month" ? record.id : undefined
                  }
                />
              );
            },
          }}
        />
      )}
      {statements?.length == 0 && (
        <Alert
          style={{ maxWidth: "500px", margin: "auto", padding: "30px" }}
          type="info"
          message="You do not have any statements yet."
          showIcon
        />
      )}
    </div>
  );
}