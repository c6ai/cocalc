import getCart from "@cocalc/server/shopping/cart/get";
import { computeCost } from "@cocalc/util/licenses/store/compute-cost";
import getBalance from "./get-balance";
import { getServerSettings } from "@cocalc/server/settings/server-settings";
import purchaseShoppingCartItem from "./purchase-shopping-cart-item";
import getLogger from "@cocalc/backend/logger";
import createStripeCheckoutSession from "./create-stripe-checkout-session";
import getChargeAmount from "@cocalc/util/purchases/charge-amount";
import getMinBalance from "./get-min-balance";

const logger = getLogger("purchases:shopping-cart-checkout");

export interface CheckoutParams {
  balance: number; // this user's balance before payment happens
  minPayment: number; // min allowed payment size
  amountDue: number; // actual amount due if it weren't for minPayment
  chargeAmount: number; // actual amount due because of minPayment
  total: number; // total of items in cart
  minBalance: number; // min allowed balance for this user
  cart; // big object that describes actual contents of the cart
}

export default async function shoppingCartCheckout({
  account_id,
  success_url,
  cancel_url,
}: {
  account_id: string;
  success_url: string;
  cancel_url?: string;
}) {
  logger.debug("shoppingCartCheckout", { account_id, success_url, cancel_url });

  const params = await getShoppingCartCheckoutParams(account_id);
  if (params.chargeAmount <= 0) {
    // immediately create all the purchase items and products for the user.
    // No need to make a stripe checkout session.
    for (const item of params.cart) {
      await purchaseShoppingCartItem(item);
    }
    return { done: true };
  }

  const session = await createStripeCheckoutSession({
    account_id,
    success_url,
    cancel_url,
    amount: params.chargeAmount,
    description: "Credit Account to Complete Store Purchase",
  });
  // make a stripe checkout session from the chargeAmount.
  // When it gets paid, user gets their purchases.
  return { done: false, session };
}

async function getCheckoutCart(account_id: string) {
  // Get the list of items in the cart that haven't been purchased
  // or saved for later, and are currently checked.
  const cart: any[] = (
    await getCart({ account_id, purchased: false, removed: false })
  ).filter((item) => item.checked);

  // compute the total cost and also set the costs for each item
  let total = 0;
  for (const item of cart) {
    item.cost = computeCost(item.description);
    total += item.cost.discounted_cost;
  }
  return { total, cart };
}

export async function getShoppingCartCheckoutParams(
  account_id: string
): Promise<CheckoutParams> {
  const { total, cart } = await getCheckoutCart(account_id);
  const minBalance = await getMinBalance(account_id);
  const balance = await getBalance(account_id);
  const { pay_as_you_go_min_payment: minPayment } = await getServerSettings();
  const { amountDue, chargeAmount } = getChargeAmount({
    cost: total,
    balance,
    minBalance,
    minPayment,
  });

  return {
    balance,
    minPayment,
    minBalance,
    amountDue,
    chargeAmount,
    total,
    cart,
  };
}