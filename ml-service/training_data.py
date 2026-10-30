"""
Synthetic labeled training data for the Community Safety Pulse ML service.

severity_data: list of (text, label) tuples where label is one of
    "High", "Medium", "Low"
spam_data: list of (text, label) tuples where label is one of
    "spam", "valid"
"""

# ---------------------------------------------------------------------------
# Severity dataset: 30 High, 30 Medium, 20 Low = 80 examples
# ---------------------------------------------------------------------------

high_severity = [
    ("Robbery A man pulled a knife and demanded my wallet on Main Street", "High"),
    ("Robbery Armed robbers held up the corner store at gunpoint", "High"),
    ("Assault A group of men attacked a pedestrian near the bus stop", "High"),
    ("Assault Woman was beaten badly outside the nightclub", "High"),
    ("Robbery Two men on a motorbike snatched a bag and pointed a gun", "High"),
    ("Assault Fight broke out and one person was stabbed in the arm", "High"),
    ("Other Shooting reported near the park, gunshots heard multiple times", "High"),
    ("Other Armed carjacking happened outside the mall parking lot", "High"),
    ("Assault Man was severely beaten by a group of attackers", "High"),
    ("Robbery Armed man threatened cashier with a gun during robbery", "High"),
    ("Other Drive-by shooting injured two bystanders on the corner", "High"),
    ("Assault Stabbing incident outside the bar left one person injured", "High"),
    ("Robbery Suspects with firearms robbed the jewelry store", "High"),
    ("Other Home invasion with weapons, family held hostage briefly", "High"),
    ("Assault Brutal attack left the victim unconscious on the sidewalk", "High"),
    ("Robbery Armed carjacker forced driver out at gunpoint and fled", "High"),
    ("Fire Building on fire with people trapped inside, explosion heard", "High"),
    ("Assault Domestic violence attack, victim stabbed by partner", "High"),
    ("Robbery Bank robbery in progress, suspects armed with handguns", "High"),
    ("Other Gang related shooting left one person dead at the scene", "High"),
    ("Assault Man attacked with a machete during an argument", "High"),
    ("Robbery Armed robbers broke into the house and threatened residents", "High"),
    ("Other Mass shooting reported at the shopping center, casualties", "High"),
    ("Assault Vicious assault with a weapon outside the school gates", "High"),
    ("Robbery Muggers attacked and stabbed a tourist for his phone", "High"),
    ("Other Explosion at the warehouse, several people badly injured", "High"),
    ("Assault Attempted murder, victim shot twice and rushed to hospital", "High"),
    ("Robbery Violent carjacking at gunpoint on the highway off-ramp", "High"),
    ("Fire Arson attack set a family home ablaze while people were inside", "High"),
    ("Assault Brutal gang assault left victim with life threatening injuries", "High"),
]

medium_severity = [
    ("Suspicious Activity Man loitering around cars for over an hour", "Medium"),
    ("Vandalism Someone spray painted graffiti all over the school wall", "Medium"),
    ("Suspicious Activity A stranger has been following me for two blocks", "Medium"),
    ("Vandalism Windows of several parked cars were smashed overnight", "Medium"),
    ("Suspicious Activity Unknown man trying door handles on our street", "Medium"),
    ("Vandalism Break-in attempt on the shop's back door, lock damaged", "Medium"),
    ("Suspicious Activity Group of teens peering into house windows at night", "Medium"),
    ("Vandalism Bus stop shelter glass was shattered deliberately", "Medium"),
    ("Suspicious Activity Man photographing houses and writing notes", "Medium"),
    ("Vandalism Fence was torn down and property spray painted", "Medium"),
    ("Suspicious Activity Someone tried to break into my car last night", "Medium"),
    ("Vandalism Playground equipment was deliberately damaged", "Medium"),
    ("Suspicious Activity Car circling the block repeatedly at night", "Medium"),
    ("Vandalism Store front window smashed with a rock, no entry made", "Medium"),
    ("Suspicious Activity Man attempted to pick the lock on the front gate", "Medium"),
    ("Vandalism Community mural was vandalized with offensive graffiti", "Medium"),
    ("Suspicious Activity Stranger followed a child from the school gate", "Medium"),
    ("Vandalism Mailboxes on the street were bent and broken", "Medium"),
    ("Suspicious Activity Two men were seen trying car door handles", "Medium"),
    ("Vandalism Tires slashed on multiple vehicles overnight", "Medium"),
    ("Suspicious Activity Someone attempted to break into the back window", "Medium"),
    ("Vandalism Park benches were smashed and spray painted", "Medium"),
    ("Suspicious Activity Van parked outside school with tinted windows watching kids", "Medium"),
    ("Vandalism Break-in attempt at the community center door", "Medium"),
    ("Suspicious Activity Man seen jumping over neighbors fences at night", "Medium"),
    ("Vandalism Someone keyed several cars along the street", "Medium"),
    ("Suspicious Activity Unfamiliar car following residents home from work", "Medium"),
    ("Vandalism Attempted break-in, crowbar marks found on the door frame", "Medium"),
    ("Suspicious Activity Person seen testing multiple car doors in the lot", "Medium"),
    ("Vandalism Recycling bins set on fire outside the apartment block", "Medium"),
]

low_severity = [
    ("Other Loud music and noise complaint from the neighbors again", "Low"),
    ("Other Neighbors have been playing loud music every night this week", "Low"),
    ("Other Someone dumped littering trash all over the sidewalk", "Low"),
    ("Road Hazard Broken streetlight has been out for two weeks", "Low"),
    ("Other Abandoned vehicle has been parked on the street for a month", "Low"),
    ("Road Hazard Pothole in the road is getting bigger after the rain", "Low"),
    ("Other Litter and garbage bags left on the corner overnight", "Low"),
    ("Road Hazard Streetlight flickering and not working properly at night", "Low"),
    ("Other Old abandoned car has flat tires and has been there for weeks", "Low"),
    ("Road Hazard Fallen tree branch blocking part of the sidewalk", "Low"),
    ("Other Noise complaint, loud party next door disturbing sleep", "Low"),
    ("Road Hazard Missing manhole cover creating a hazard on the road", "Low"),
    ("Other Illegal dumping of household waste behind the building", "Low"),
    ("Road Hazard Traffic light has been malfunctioning at the intersection", "Low"),
    ("Other Littering, food wrappers and bottles scattered in the park", "Low"),
    ("Road Hazard Broken streetlight makes the alley very dark at night", "Low"),
    ("Other Abandoned shopping cart left blocking the pavement", "Low"),
    ("Road Hazard Large pothole causing minor damage to car tires", "Low"),
    ("Other Loud construction noise starting very early every morning", "Low"),
    ("Road Hazard Street sign knocked down and lying on the sidewalk", "Low"),
]

severity_data = high_severity + medium_severity + low_severity

# ---------------------------------------------------------------------------
# Spam dataset: 20 valid, 20 spam = 40 examples
# ---------------------------------------------------------------------------

valid_reports = [
    ("Suspicious man loitering near the school gate for the past hour", "valid"),
    ("My car window was smashed and a laptop was stolen overnight", "valid"),
    ("Group of youths vandalized the bus shelter on Oak Street", "valid"),
    ("A woman was followed from the train station by an unknown man", "valid"),
    ("Two men attempted to break into the corner shop after closing", "valid"),
    ("Streetlight on Elm Avenue has been broken for over a week", "valid"),
    ("Loud altercation heard outside the apartment building last night", "valid"),
    ("Someone spray painted graffiti across the community center wall", "valid"),
    ("A car has been circling the neighborhood slowly for the last hour", "valid"),
    ("Reported a small fire starting near the dumpsters behind the mall", "valid"),
    ("Witnessed a hit and run accident at the Fifth and Main intersection", "valid"),
    ("Found a broken window at the vacant house on Birch Street", "valid"),
    ("A stranger tried to open my front gate around midnight", "valid"),
    ("Pothole on Baker Road has grown large enough to damage tires", "valid"),
    ("Reporting an abandoned vehicle parked illegally for three weeks", "valid"),
    ("Overheard a threat being made against a shop owner downtown", "valid"),
    ("Saw someone tampering with the lock on the community mailbox", "valid"),
    ("A dog off its leash chased several children in the park", "valid"),
    ("There was a break-in attempt at unit 4B last night", "valid"),
    ("Noticed suspicious activity near the ATM on Church Street", "valid"),
]

spam_reports = [
    ("test", "spam"),
    ("testing", "spam"),
    ("hello", "spam"),
    ("hi there", "spam"),
    ("asdkjhaskjdh", "spam"),
    ("qwertyuiop", "spam"),
    ("lol", "spam"),
    ("this is a test report please ignore", "spam"),
    ("123456", "spam"),
    ("just testing the app", "spam"),
    ("blah blah blah", "spam"),
    ("random text random text", "spam"),
    ("aaaaaaaaaaaa", "spam"),
    ("check check check", "spam"),
    ("nothing to report just testing", "spam"),
    ("hey what's up", "spam"),
    ("xxxxxxxx", "spam"),
    ("this app is cool", "spam"),
    ("sample text", "spam"),
    ("no incident just checking the form works", "spam"),
]

spam_data = valid_reports + spam_reports
