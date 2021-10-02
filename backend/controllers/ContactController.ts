import express from 'express';
import Contact from '../models/ContactModel';
import { transporter } from '../utils';
import { emailFunction, isNotEmpty, isValid, messageHasLength, numberCheck, validateEmail } from '../utils';

export const postContactForm = async(req: express.Request, res: express.Response, next: express.NextFunction) => 
{
    const { fname, email, telephone, city, message } = req.body;
    
    if (
          isValid(fname, isNotEmpty)
          && isValid(email, validateEmail)
          && isValid(telephone, numberCheck)
          && isValid(city, isNotEmpty)
          && isValid(message, messageHasLength)
      
        )
    {
        const contact = new Contact(
            {
                fname,
                email,
                telephone,
                city,
                message,
            }
        );
        const createdContact = await contact.save();
    
        if(!createdContact)
            return next()

        let mailOptions = 
        {
            from: 'Salvatore- NO REPLY no-reply@salderosa.com',
            to: email,
            subject: `Contact form n. ${contact._id.toString()}`,
            html: emailFunction(fname, email, telephone, city, message),
        }

        //send copy to the User
        transporter.sendMail(
            mailOptions, 
            async(err, data) =>
            {
                if(err)
                {
                    await Contact.findByIdAndUpdate(contact._id, { sentConfirmation: false })
                    return next()
                }
                await Contact.findByIdAndUpdate(contact._id, { sentConfirmation: true })
            }
        )

        //send actual contact form to ourselves
        transporter.sendMail(
            {
                from: email,
                to: 'my@mail.com',
                subject: `Contact request n. ${contact._id}`,
                html: ` Name: ${fname}<br>
                        Email: ${email}<br>
                        Phone Number: ${telephone}<br>
                        City: ${city}<br>

                        <br><br><br>

                        Message:<br>
                        ${message}`,
            }, 
            async(err, data) => 
            {
                if(err)
                {
                    await Contact.findByIdAndUpdate(contact._id, { receivedEmail: false })
                    return next()
                }
                await Contact.findByIdAndUpdate(contact._id, { receivedEmail: true }) 
                return res.send({ message: 'Thanks for Contacting US', data: createdContact })

            }
        )
    }
    else
        return next()
}