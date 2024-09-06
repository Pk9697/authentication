const verifyIsAuth = (req, res, next) => {
    if (!req.session?.isAuth) {
        return res.status(401).json({
            success: false,
            message:'Session expired please login again'
        })
    }

    next()
}

module.exports=verifyIsAuth