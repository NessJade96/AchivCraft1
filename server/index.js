require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const { supabaseClient } = require("./src/databaseClient.js");

app.use(cookieParser());
app.use(
	cors({
		origin: "http://localhost:5173", // Allow requests from this origin
		optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204,
		credentials: true,
	})
);
app.use(bodyParser.json());

const credentials = btoa(
	process.env.BNET_OAUTH_CLIENT_ID +
		":" +
		process.env.BNET_OAUTH_CLIENT_SECRET
);
const formData = new URLSearchParams();
formData.append("grant_type", "client_credentials");

app.get("/ping", function (req, res) {
	return res.json({
		ping: true,
	});
});

app.get("/search", async function (req, res) {
	const { realmSlug, characterName } = req.query;
	console.log("🚀 ~ characterName:", characterName);
	console.log("🚀 ~ realmSlug:", realmSlug);

	// Retrieve the JWT from cookies
	const signedJwt = req.cookies.jwt;
	if (!signedJwt) {
		res.status(401).json({ message: "JWT not found" });
		return;
	}
	// Verify the JWT
	const decodedToken = jwt.verify(signedJwt, "Super_Secret_Password");

	if (!decodedToken.access_token) {
		res.status(401).json({ message: "Invalid access token" });
		return;
	}

	//GETs the characters info from WOW api
	const characterResponse = await fetch(
		`https://us.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}?namespace=profile-us&locale=en_US`,
		{
			method: "GET",
			headers: { Authorization: "Bearer " + decodedToken.access_token },
		}
	).catch((error) => {
		console.error("Error:", error);
		return error;
	});

	if (!characterResponse.ok) {
		throw new Error("Network response was not ok");
	}
	const characterJSON = await characterResponse.json();
	const character = {
		name: characterJSON.name,
		faction: characterJSON.faction.name,
		race: characterJSON.race.name,
		class: characterJSON.character_class.name,
		achievementPoints: characterJSON.achievement_points,
		realmSlug: characterJSON.realm.slug,
	};
	res.json(character);
});

app.post("/login", async function (req, res) {
	const { email, password } = req.body;

	if (!email || !password) {
		res.sendStatus(401);
		return;
	}

	const {
		data: { user },
	} = await supabaseClient.auth.signInWithPassword({
		email,
		password,
	});

	if (!user) {
		res.sendStatus(401);
		return;
	}

	const battleNetTokenJson = await getBattleNetToken();

	const signedJwt = jwt.sign(
		{
			access_token: battleNetTokenJson.access_token,
		},
		"Super_Secret_Password"
	);

	res.cookie("jwt", signedJwt, {
		httpOnly: true,
		maxAge: 3600000,
		domain: "localhost",
		path: "/",
	}); // maxAge is in milliseconds (1 hour in this case)
	res.json({ success: true });
});

app.post("/signup", async function (req, res) {
	const { email, password } = req.body;

	if (!email || !password) {
		res.sendStatus(401);
		return;
	}

	const {
		data: { user },
	} = await supabaseClient.auth.signUp({
		email,
		password,
	});

	if (!user) {
		res.sendStatus(401);
		return;
	}

	const battleNetTokenJson = await getBattleNetToken();

	const signedJwt = jwt.sign(
		{
			access_token: battleNetTokenJson.access_token,
		},
		"Super_Secret_Password"
	);

	res.cookie("jwt", signedJwt, {
		httpOnly: true,
		maxAge: 3600000,
		domain: "localhost",
		path: "/",
	}); // maxAge is in milliseconds (1 hour in this case)
	res.json({ success: true });
});

app.post("/follow", async function (req, res) {
	const {
		characterName,
		characterfaction,
		characterRace,
		characterClass,
		characterAchievementPoints,
		characterRealmSlug,
	} = req.body;

	if (
		!characterName ||
		!characterfaction ||
		!characterRace ||
		!characterClass ||
		!characterAchievementPoints ||
		!characterRealmSlug
	) {
		res.sendStatus(401);
		return;
	}

	const { data, error } = await supabaseClient
		.from("character")
		.upsert(
			{
				name: characterName,
				faction: characterfaction,
				race: characterRace,
				class: characterClass,
				achievement_points: characterAchievementPoints,
				realm_slug: characterRealmSlug,
			},
			{ onConflict: "name, realm_slug" }
		)
		.select("id");
	console.log("🚀 ~ data:", data);
	console.log("🚀 ~ error:", error);

	if (error) {
		return res.sendStatus(400);
	}

	// now that we have added the character to the DB (if not already in there)
	// Create insert to the follow table
	// send reponse back
	// update "follow" button to say "following"
});

app.get("/profile/wow/character/achievement", async function (req, res) {
	// Retrieve the JWT from cookies
	const signedJwt = req.cookies.jwt;
	if (!signedJwt) {
		res.status(401).json({ message: "JWT not found" });
		return;
	}

	// Verify the JWT
	const decodedToken = jwt.verify(signedJwt, "Super_Secret_Password");

	if (!decodedToken.access_token) {
		res.status(401).json({ message: "Invalid access token" });
		return;
	}

	const characterAchievementsResponse = await getCharacterAchievementsReponse(
		req,
		res,
		decodedToken
	);
	console.log(
		"🚀 ~ characterAchievementsReponse:",
		characterAchievementsResponse
	);
	const characterAchievementsJSON =
		await characterAchievementsResponse.json();
	res.json(characterAchievementsJSON);
	return characterAchievementsResponse;
});

async function getBattleNetToken() {
	const battleNetTokenResponse = await fetch(
		"https://us.battle.net/oauth/token",
		{
			method: "POST",
			body: formData,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + credentials,
			},
		}
	).catch((error) => {
		console.error("Error:", error);
		return error;
	});

	if (!battleNetTokenResponse.ok) {
		throw new Error("Network response was not ok");
	}
	const battleNetTokenJson = await battleNetTokenResponse.json();
	return battleNetTokenJson;
}

const getCharacterAchievementsReponse = async function (
	req,
	res,
	decodedToken
) {
	const realmSlug = "frostmourne";
	const characterName = "astraxi";

	//const { realmSlug, characterName } = req.query;
	const decodedJWTToken = decodedToken;
	console.log("🚀 ~ characterName:", characterName);
	console.log("🚀 ~ realmSlug:", realmSlug);
	const characterAchievementsResponse = await fetch(
		`https://us.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}/achievements?namespace=profile-us&locale=en_US`,
		{
			method: "GET",
			headers: {
				Authorization: "Bearer " + decodedJWTToken.access_token,
			},
		}
	).catch((error) => {
		console.error("Error:", error);
		return error;
	});

	if (!characterAchievementsResponse.ok) {
		throw new Error("Network response was not ok");
	}
	return characterAchievementsResponse;
};

app.get("/logout", function (req, res) {
	req.logout();
	res.redirect("/");
});

app.use(function (err, req, res, next) {
	console.error(err);
	res.send("<h1>Internal Server Error</h1>");
});

const server = app.listen(3000, function () {
	console.log("Listening on port %d", server.address().port);
});
