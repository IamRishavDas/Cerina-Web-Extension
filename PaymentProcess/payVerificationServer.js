const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Endpoint to handle Razorpay payment verification
app.post('/verify-payment', async (req, res) => {
  const paymentId = req.body.razorpay_payment_id;
  const orderId = req.body.razorpay_order_id;
  const signature = req.body.razorpay_signature;

  try {
    // Verify the payment
    const attributes = {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    };
    const payment = await razorpay.payments.fetch(attributes.razorpay_payment_id);

    // Check if payment is successful
    if (payment.status === 'captured') {
      
      const userId = payment.notes.userId; // Assuming userId in payment notes
      
      res.status(200).send('Payment successful. Access granted.');
    } else {
      res.status(400).send('Payment failed or not captured.');
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).send('Error verifying payment.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
