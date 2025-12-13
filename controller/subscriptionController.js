const transporter = require('../middleware/nodemailer')
const { subscriberMail } = require('../middleware/validator')
const subscription = require('../model/subscription')

// subscribe mail controller

const subscribeMails = async (req, res) => {
    // get email from request body
    const { email } = req.body
    try {
        // validate email from client side
        const { error } = subscriberMail.validate({ email })
        if (error) {
            return res.status(401).json({ success: false, message: error.details[0].message });
        }

        // Check if email already exists
        const alreadySubscribed = await subscription.findOne({ email });
        if (alreadySubscribed) {
            return res.status(409).json({ success: false, message: 'Email already subscribed.' });
        }


        // send news email to client
        //     await transporter.sendMail({
        //         from: process.env.EMAIL,
        //         to: email,
        //         subject: "Welcome to Success Axis Foods!",
        //         attachments: [{
        //             filename: "banner.jpg",
        //             path: encodeURI("https://res.cloudinary.com/dro9wcugg/image/upload/v1765573840/products/b87coh3o8fxagorzbgtq.jpg"),
        //             cid: "banner"
        //         }],
        //         html: `
        // <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        //     <!-- Banner -->
        //     <img src="cid:banner" alt="Farm Banner" style="width: 100%;">

        //     <!-- Header -->
        //     <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
        //         <h1 style="margin: 0;">SUCCESS AXIS FOODS</h1>
        //         <p>Premium Pasture-Raised Poultry</p>
        //     </div>

        //     <!-- Content -->
        //     <div style="padding: 20px;">
        //         <h2 style="color: #2e7d32;">Welcome!</h2>
        //         <p>Thank you for joining our community of premium poultry lovers.</p>

        //         <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        //             <h3 style="color: #388e3c; margin-top: 0;">You'll receive:</h3>
        //             <ul>
        //                 <li>Farm updates & new products</li>
        //                 <li>Exclusive discounts</li>
        //                 <li>Recipes & cooking tips</li>
        //             </ul>
        //         </div>

        //         <div style="text-align: center; margin: 30px 0;">
        //             <a href="https://portryfarm.vercel.app/" 
        //                style="background: #4CAF50; color: white; padding: 12px 24px; 
        //                       text-decoration: none; border-radius: 6px; font-weight: bold;">
        //                Visit Our Store
        //             </a>
        //         </div>
        //     </div>

        //     <!-- Footer -->
        //     <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        //         <p>Success Axis Foods • Family-owned since 2010</p>
        //         <p>Contact: info@successaxisfoods.com</p>
        //         <p><a href="https://portryfarm.vercel.app/unsubscribe" style="color: #4CAF50;">Unsubscribe</a></p>
        //     </div>
        // </div>
        // `


        //     })

        //        await transporter.sendMail({
        //     from: process.env.EMAIL,
        //     to: email,
        //     subject: "WELCOME TO NAYA AXIS FOODS!",

        //     attachments: [
        //         {
        //             filename: "logo.jpg",
        //             path: encodeURI("https://res.cloudinary.com/dro9wcugg/image/upload/v1765573840/products/b87coh3o8fxagorzbgtq.jpg"),
        //             cid: "banner"
        //         }
        //     ],

        //     html: `
        //     <div style="max-width: 650px; margin: auto; background: #ffffff; 
        //                 border-radius: 10px; overflow: hidden; font-family: Arial, sans-serif;
        //                 box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

        //         <!-- Top Banner -->
        //         <div style="text-align: center; background: #f3f7f2; padding: 25px;">
        //             <img src="cid:banner" alt="naya axis foods" 
        //                  style="width: 220px; height: auto; border-radius: 10px; box-shadow: 0 3px 12px rgba(0,0,0,0.15);">
        //         </div>

        //         <!-- Header Section -->
        //         <div style="background: linear-gradient(to right, #4CAF50, #2e7d32); padding: 35px 20px; text-align: center; color: #fff;">
        //             <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">NAYA AXIS FOODS</h1>
        //             <p style="margin-top: 8px; font-size: 15px;">Premium Pasture-Raised Poultry Delivered Fresh</p>
        //         </div>

        //         <!-- Content Body -->
        //         <div style="padding: 30px 25px;">
        //             <h2 style="margin: 0; color: #2e7d32; font-size: 22px;">Welcome to the Family!</h2>
        //             <p style="margin-top: 12px; line-height: 1.6; color: #444;">
        //                 Thank you for subscribing to Naya axis foods. We are proud to bring you premium-quality
        //                 poultry products and a wonderful farm-to-table experience.
        //             </p>

        //             <!-- Highlight Box -->
        //             <div style="background: #f9f9f9; padding: 18px; border-radius: 8px; margin-top: 20px; border-left: 5px solid #4CAF50;">
        //                 <p style="margin: 0; color: #333; font-size: 15px;"><strong>You will now receive:</strong></p>
        //                 <ul style="margin: 10px 0 0; padding-left: 20px; color: #555; line-height: 1.6;">
        //                     <li>Exclusive farm updates and livestock availability</li>
        //                     <li>Special offers and seasonal discounts</li>
        //                     <li>Expert poultry care tips and cooking inspiration</li>
        //                 </ul>
        //             </div>

        //             <!-- Button -->
        //             <div style="text-align: center; margin-top: 30px;">
        //                 <a href="https://portryfarm.vercel.app/shop"
        //                    style="background: #4CAF50; color: white; padding: 14px 28px; 
        //                           text-decoration: none; border-radius: 7px; font-size: 16px;
        //                           display: inline-block; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);">
        //                    Visit Our Shop
        //                 </a>
        //             </div>

        //             <!-- Divider -->
        //             <hr style="margin: 35px 0; border: none; border-top: 1px solid #eee;">

        //             <!-- Extra Note -->
        //             <p style="color: #666; font-size: 14px; line-height: 1.6;">
        //                 If you ever have questions about our products or services, feel free to reach out.
        //                 We are always here to support you on your poultry journey.
        //             </p>
        //         </div>

        //         <!-- Footer -->
        //         <div style="background: #f4f4f4; padding: 18px; text-align: center; color: #666; font-size: 12px;">
        //             <p style="margin: 0;">Naya Axis Foods • Serving Quality Since 2010</p>
        //             <p style="margin-top: 6px;">
        //                 <a href="mailto:info@successaxisfoods.com" style="color: #4CAF50;">Contact</a> |
        //                 <a href="https://portryfarm.vercel.app/unsubscribe" style="color: #4CAF50;">Unsubscribe</a>
        //             </p>
        //         </div>
        //     </div>
        //     `
        // });

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: "Welcome to Success Axis Foods!",

            attachments: [
                {
                    filename: "logo.jpg",
                    path: encodeURI("https://res.cloudinary.com/dro9wcugg/image/upload/v1765573840/products/b87coh3o8fxagorzbgtq.jpg"),
                    cid: "banner"
                }
            ],

            html: `
    <div style="max-width: 650px; margin: auto; background: #121212;
                border-radius: 12px; overflow: hidden; 
                font-family: Arial, sans-serif; color: #e5e5e5;
                box-shadow: 0 4px 25px rgba(0,0,0,0.6);">

        <!-- Banner -->
        <div style="text-align: center; background: #1a1a1a; padding: 30px 0;">
            <img src="cid:banner" alt="Success Axis Foods"
                 style="width: 200px; height: auto; border-radius: 10px;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.45);">
        </div>

        <!-- Header -->
        <div style="background: linear-gradient(to right, #2e8b38, #1b5e20);
                    padding: 40px 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">
                SUCCESS AXIS FOODS
            </h1>
            <p style="margin-top: 10px; font-size: 15px; opacity: 0.9;">
                Premium Pasture-Raised Poultry Delivered Fresh
            </p>
        </div>

        <!-- Body -->
        <div style="padding: 30px 25px;">
            <h2 style="margin: 0; font-size: 24px; color: #81c784;">Welcome to the Family!</h2>

            <p style="margin-top: 12px; line-height: 1.7; color: #d4d4d4;">
                Thank you for subscribing to Success Axis Foods. We are excited to provide you 
                with fresh, high-quality poultry products raised with care and commitment.
            </p>

            <!-- Highlight Box -->
            <div style="margin-top: 20px; background: #1e1e1e; padding: 18px;
                        border-radius: 8px; border-left: 5px solid #4CAF50;">
                <p style="margin: 0; color: #cfcfcf;"><strong>You will now receive:</strong></p>
                <ul style="margin-top: 10px; padding-left: 22px; line-height: 1.7; color: #bbbbbb;">
                    <li>Exclusive farm updates and livestock availability</li>
                    <li>Seasonal discounts and special offers</li>
                    <li>Poultry care tips and cooking inspiration</li>
                </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-top: 35px;">
                <a href="https://portryfarm.vercel.app/shop"
                   style="background: #43a047; color: white; padding: 14px 28px;
                          text-decoration: none; font-size: 16px;
                          border-radius: 8px; display: inline-block;
                          box-shadow: 0 4px 15px rgba(76,175,80,0.4);">
                    Visit Our Shop
                </a>
            </div>

            <!-- Divider -->
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #333;">
            
            <p style="font-size: 14px; line-height: 1.7; color: #aaaaaa;">
                If you have any questions, feel free to reach out. 
                We are always ready to support you with premium farm products and expert guidance.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 18px; text-align: center; color: #9a9a9a; font-size: 12px;">
            <p style="margin: 0;">Success Axis Foods • Serving Quality Since 2010</p>
            <p style="margin-top: 6px;">
                <a href="mailto:info@successaxisfoods.com" style="color: #4CAF50;">Contact</a> |
                <a href="https://portryfarm.vercel.app/unsubscribe" style="color: #4CAF50;">Unsubscribe</a>
            </p>
        </div>
    </div>
    `
        });



        // create new email object
        const newSubscriber = new subscription({
            email
        })

        await newSubscriber.save()
        res.status(201).json({ sucess: "true", message: 'Thanks for subscribing.' })


    } catch (error) {
        // console.log(error);

        res.status(500).json({ error: error.message});

    }
}

module.exports = subscribeMails