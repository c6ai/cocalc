import {
  Button,
  Divider,
  InputNumber,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import { Icon } from "@cocalc/frontend/components/icon";
import { useEffect, useState } from "react";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { currency } from "./util";
import { zIndex as zIndexPayAsGo } from "./pay-as-you-go/modal";
import { open_new_tab } from "@cocalc/frontend/misc/open-browser-tab";
import { delay } from "awaiting";
import { cancelCurrentCheckoutSession } from "./api";
import MoneyStatistic from "./money-statistic";

const zIndex = zIndexPayAsGo + 1;
export const zIndexTip = zIndex + 1;

const DEFAULT_AMOUNT = 10;

interface Props {
  balance: number;
  update: () => void;
  cost?: number; // optional amount that we want to encourage the user to pay
}

export default function Payment({ balance, update, cost }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(
    Math.max(DEFAULT_AMOUNT, balance ?? 0)
  );
  const [session, setSession] = useState<
    { id: string; url: string } | null | "loading"
  >("loading");
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);

  const [minPayment, setMinPayment] = useState<number | undefined>(undefined);
  const updateMinPayment = () => {
    (async () => {
      setMinPayment(await webapp_client.purchases_client.getMinimumPayment());
    })();
  };
  useEffect(() => {
    updateMinPayment();
  }, []);

  const updateSession = async () => {
    setSession(
      await webapp_client.purchases_client.getCurrentCheckoutSession()
    );
  };

  useEffect(() => {
    updateSession();
  }, [isModalVisible]);

  const paymentPopup = async (url: string) => {
    // create pop-up window with the payment info
    const popup = open_new_tab(url, true);
    if (popup == null) {
      // popup was blocked
      return;
    }
    while (true) {
      if (popup.closed) {
        // user explicitly closed it, so done.
        break;
      }
      try {
        if (popup.location.href == window.location.href) {
          break;
        }
      } catch (_) {
        // due to security, when on the stripe page, just looking at
        // popup.location.href should throw an exception.
      }
      await delay(500);
    }
    // attempt to close the popup, if possible
    try {
      popup.close();
    } catch (_) {}
    setIsModalVisible(false);
    updateSession();
    update();
  };

  const showModal = () => {
    setPaymentAmount(
      cost
        ? Math.max(minPayment ?? 0, cost)
        : Math.max(minPayment ?? 0, balance ?? 0)
    );
    setIsModalVisible(true);
    if (typeof session == "object" && session?.url) {
      paymentPopup(session.url);
    }
  };

  const cancelPayment = async () => {
    try {
      setCancelling(true);
      await cancelCurrentCheckoutSession();
      await updateSession();
      setIsModalVisible(false);
    } catch (err) {
      console.warn("ERROR canceling checkout session", err);
    } finally {
      setCancelling(false);
    }
  };

  const handleOk = async () => {
    if (
      paying ||
      !paymentAmount ||
      paymentAmount < 0 ||
      (typeof session == "object" && session?.id)
    ) {
      return;
    }
    try {
      setPaying(true);
      // this is a stripe checkout session:
      // NOTE: we monitor a popup for hitting the
      // success or cancel url, so they must be
      // window.location.href.  Also, we can't even
      // check the URL unless it is same domain.
      const session0 = await webapp_client.purchases_client.createCredit({
        amount: paymentAmount,
        success_url: window.location.href,
        cancel_url: window.location.href,
      });
      setSession(session0);
      paymentPopup(session0.url);
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  function renderBody() {
    if (!isModalVisible) {
      return null;
    }
    if (session == "loading") {
      return <Spin />;
    }
    if (session != null) {
      return (
        <div style={{ fontSize: "12pt" }}>
          If the popup payment window is blocked,{" "}
          <a href={session.url}>click here to complete your payment.</a>
        </div>
      );
    }
    return (
      <div>
        <div style={{ textAlign: "center" }}>
          <MoneyStatistic title={"Current Balance"} value={balance} />
        </div>
        <Divider plain orientation="left">
          Enter payment amount (in US dollars)
          <Tooltip
            zIndex={zIndexTip}
            title="If your payment exceeds your balance, then you will have a negative balance, which can be used for purchases that exceed your spending limit. Credits are nonrefundable, but do not expire."
          >
            <Icon name="question-circle" style={{ marginLeft: "30px" }} />
          </Tooltip>
        </Divider>
        <div style={{ textAlign: "center" }}>
          {minPayment != null && (
            <div style={{ marginBottom: "15px" }}>
              {minPayment != null && (
                <Preset amount={minPayment} setPaymentAmount={setPaymentAmount}>
                  Minimum: {currency(minPayment)}
                </Preset>
              )}
              {minPayment != null && balance >= minPayment && (
                <Preset amount={balance} setPaymentAmount={setPaymentAmount}>
                  Balance: {currency(balance)}
                </Preset>
              )}
              {DEFAULT_AMOUNT >= minPayment && (
                <Preset
                  amount={DEFAULT_AMOUNT}
                  setPaymentAmount={setPaymentAmount}
                >
                  ${DEFAULT_AMOUNT}
                </Preset>
              )}
              {20 >= minPayment && (
                <Preset amount={20} setPaymentAmount={setPaymentAmount}>
                  $20
                </Preset>
              )}
              {100 >= minPayment && (
                <Preset amount={100} setPaymentAmount={setPaymentAmount}>
                  $100
                </Preset>
              )}
            </div>
          )}
          <Space>
            <InputNumber
              min={minPayment}
              max={100000} // maximum payment amount is $100,000
              precision={2} // for two decimal places
              step={0.01} // smallest possible increment is one cent
              value={paymentAmount}
              onChange={(value) => setPaymentAmount(value)}
              addonAfter="$"
            />
            <div>+ TAX</div>
          </Space>
        </div>
        <Divider plain orientation="left">
          What Happens Next
        </Divider>
        When you click "Add Money..." a new window will appear, where you can
        enter your payment details.
      </div>
    );
  }

  return (
    <div>
      <Button.Group>
        <Button
          disabled={balance == null || cancelling}
          onClick={showModal}
          type={
            (cost ?? 0) > 0 || (typeof session == "object" && session?.id)
              ? "primary"
              : undefined
          }
        >
          <Icon name="credit-card" style={{ marginRight: "5px" }} />
          {session == "loading" && <Spin />}
          {typeof session == "object" && session?.id
            ? "Finish Payment..."
            : cost
            ? `Add at least ${currency(cost)}`
            : "Add Money..."}
        </Button>
        {typeof session == "object" && session?.id && (
          <Button disabled={cancelling} onClick={cancelPayment}>
            Cancel
            {cancelling && (
              <>
                {" "}
                <Spin />
              </>
            )}
          </Button>
        )}
      </Button.Group>
      <Modal
        okButtonProps={{ disabled: paying }}
        okText={
          session != null ? (
            ""
          ) : paying ? (
            <>
              Adding money... <Spin />
            </>
          ) : (
            "Add Money..."
          )
        }
        maskClosable={false}
        zIndex={zIndex}
        title={
          <>
            <Icon name="credit-card" style={{ marginRight: "5px" }} /> Make
            Payment
          </>
        }
        open={balance != null && isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        {renderBody()}
      </Modal>
    </div>
  );
}

export function Preset({ amount, setPaymentAmount, children }) {
  return (
    <Tag
      style={{ cursor: "pointer", marginBottom: "5px" }}
      color="blue"
      onClick={() => setPaymentAmount(amount)}
    >
      {children}
    </Tag>
  );
}