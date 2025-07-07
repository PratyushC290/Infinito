import Joi from 'joi';

const userSchema = Joi.object({
    user: Joi.object({
        username: Joi.string().required(),
        email: Joi.string().required(),
        fullname: Joi.string().required(),
        password: Joi.string().required(),
        collegeName: Joi.string().required(),
        rollNo: Joi.string().required(),
        address: Joi.string().required(),
        mobileNo: Joi.string().required(),
        profilePicture: Joi.string().allow("", null),
        role: Joi.string().required(),
        isIITPstud: Joi.boolean().required(),
        PORs: Joi.array().items(
            Joi.object({
                type: Joi.string().required()
            })
        )




    }).required()
});
export default listingSchema;