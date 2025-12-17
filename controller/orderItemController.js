const orderModel = require("../model/orderModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");

const createOrder = async (req, res) => {
    try {
        // 1. Validate request body
        const { error, value } = orderValidator.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details.map(d => d.message),
            });
        }

        // 2. Generate order number
        const orderNumber = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // 3. Save order to DB
        const order = await orderModel.create({
            orderNumber,
            ...value,
        });

        // 4. Build email HTML
        const itemsHtml = order.items.map(item => `
            <tr>
                <td>
                    <strong>${item.name}</strong><br/>
                    Category: ${item.category || "N/A"}<br/>
                    Qty: ${item.quantity}<br/>
                    Price: ₵${item.price}<br/>
                    Total: ₵${item.totalPrice}
                </td>
                <td>
                    ${(item.images || []).map(img => `
                        <img src="${img}" width="80" style="margin:5px;border-radius:4px" />
                    `).join("")}
                </td>
            </tr>
        `).join("");

        const mailHtml = `
            <h2>New Poultry Order Received</h2>

            <p><strong>Order Number:</strong> ${order.orderNumber}</p>

            <h3>Customer Information</h3>
            <p>
                Name: ${order.customerInfo.name}<br/>
                Phone: ${order.customerInfo.phone}<br/>
                Email: ${order.customerInfo.email || "N/A"}<br/>
                Address: ${order.customerInfo.address || "N/A"}<br/>
                Delivery Type: ${order.customerInfo.deliveryType}<br/>
                Payment Method: ${order.customerInfo.paymentMethod}
            </p>

            <h3>Ordered Items</h3>
            <table border="1" cellpadding="10" cellspacing="0" width="100%">
                <thead>
                    <tr>
                        <th>Item Details</th>
                        <th>Images</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        `;

        // 5. Send email to company
        await transporter.sendMail({
            from: `"Website Orders" <${process.env.COMPANY_EMAIL}>`,
            to: process.env.COMPANY_EMAIL,
            subject: `New Order - ${order.orderNumber}`,
            html: mailHtml,
        });

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again.",
        });
    }
};

module.exports = {createOrder}