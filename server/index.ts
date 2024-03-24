require("dotenv").config();
import express from "express";
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
import { router as characterRouter } from "./src/routers/character";
import { router as followRouter } from "./src/routers/follow";
import { router as loginRouter } from "./src/routers/login";
import { router as logoutRouter } from "./src/routers/logout";
import { router as searchRouter } from "./src/routers/search";
import { router as signupRouter } from "./src/routers/signup";
import { router as unfollowRouter } from "./src/routers/unfollow";
import { router as healthRouter } from "./src/routers/health";


app.use(cookieParser());
app.use(
	cors({
		origin: process.env.CLIENT_URL, // Allow requests from this origin
		optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204,
		credentials: true,
	})
);
app.use(bodyParser.json());

app.use("/health", healthRouter);
app.use("/character", characterRouter);
app.use("/follow", followRouter);
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/search", searchRouter);
app.use("/signup", signupRouter);
app.use("/unfollow", unfollowRouter);

app.use(function (err, req, res) {
	console.error(err);
	return;
});

app.listen(process.env.PORT, () => {
	console.log(`Listening on http://localhost:${process.env.PORT}`);
});


