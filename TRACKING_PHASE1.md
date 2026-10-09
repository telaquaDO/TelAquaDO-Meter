# Tel-Aqua Phase 1 conversion tracking (GTM manual setup)

Frontend now pushes clean `dataLayer` ecommerce events. **Do not publish GTM from this repo.** Configure tags in the existing container only.

## Existing IDs

| Platform | ID | Notes |
|---|---|---|
| GTM container | `GTM-K65HB64W` | Already on storefront HTML. Do not add another snippet. |
| GA4 | `G-ZFCPJNFDD9` | Use the existing GA4 Configuration / Google tag. Do not add another base tag. |
| Meta Pixel | `4612743812386133` | Use the existing Pixel. Do not add another base Pixel. |
| Microsoft Clarity | `ydz7qm3b95` | Add via GTM All Pages only if it is not already present. |

## Data Layer Variables to create

Create GTM Data Layer Variables (Version 2) for:

- `ecommerce.transaction_id`
- `ecommerce.value`
- `ecommerce.currency`
- `ecommerce.items`
- `ecommerce.coupon`
- `payment_type`
- `order_status`
- `user_data.email`
- `user_data.phone`
- `user_data.first_name`
- `user_data.city`
- `user_data.region`
- `user_data.postal_code`
- `user_data.country`

## Custom Event triggers to create

| Trigger name | Event name |
|---|---|
| CE - view_item | `view_item` |
| CE - add_to_cart | `add_to_cart` |
| CE - begin_checkout | `begin_checkout` |
| CE - add_payment_info | `add_payment_info` |
| CE - purchase | `purchase` |

Do **not** publish until Preview confirms payloads.

## GA4 Event tags (existing measurement ID `G-ZFCPJNFDD9`)

Create GA4 Event tags that use the existing GA4 Google tag / Configuration tag. Send ecommerce from the Data Layer (GA4 recommended events):

| Tag | Event name | Trigger |
|---|---|---|
| GA4 - view_item | `view_item` | CE - view_item |
| GA4 - add_to_cart | `add_to_cart` | CE - add_to_cart |
| GA4 - begin_checkout | `begin_checkout` | CE - begin_checkout |
| GA4 - add_payment_info | `add_payment_info` | CE - add_payment_info |
| GA4 - purchase | `purchase` | CE - purchase |

Map `ecommerce` items/value/currency/transaction_id/coupon from the Data Layer. Do not invent values in GTM.

## Meta browser events (existing Pixel `4612743812386133`)

| dataLayer event | Meta standard event |
|---|---|
| `view_item` | ViewContent |
| `add_to_cart` | AddToCart |
| `begin_checkout` | InitiateCheckout |
| `add_payment_info` | AddPaymentInfo |
| `purchase` | Purchase |

For Meta **Purchase**, set:

`eventID` = Data Layer `ecommerce.transaction_id`

Later server-side Meta CAPI must use the same value as `event_id`. **Do not implement CAPI yet.**

## Microsoft Clarity

If Clarity is not already in this GTM container:

- Tag: Microsoft Clarity
- Project ID: `ydz7qm3b95`
- Trigger: All Pages

Do not add a second Clarity snippet in HTML.

## Frontend event locations (already implemented)

- `view_item`: `product.html` and homepage (`index.html`) only
- `add_to_cart`: after `TelAquaCart.add()` returns true
- `begin_checkout`: `checkout.html` only (not `order-success.html`)
- `add_payment_info`: `checkout.html` payment radio (`COD` / `Razorpay`)
- `purchase` COD: after `placeWebsiteCodOrder` succeeds, before redirect
- `purchase` Razorpay: after `verifyPayment` success, before redirect
- `transaction_id`: Tel-Aqua `order_number` (`TAQ-000123`)
- Purchase dedupe: `sessionStorage` key `taq_purchase_sent_<transaction_id>`

## Not in Phase 1

- Meta Conversions API
- Google Ads conversion ID/label
- Google Enhanced Conversions final setup
- Confirmed-COD offline conversion
