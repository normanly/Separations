# 1. Set the feed and design choices
from math import ceil, exp, floor, isclose, log, sqrt

feed_moles = 100.0
names = ["n-Pentane", "n-Hexane", "n-Heptane", "n-Octane"]
z = [0.25, 0.25, 0.25, 0.25]       # Feed mole fractions
alpha = [2.50, 2.00, 1.00, 0.70]  # Relative to the heavy key
light, heavy = 1, 2                # Python indices start at zero
q = 0.50                          # Liquid fraction of the feed
light_recovery = 0.95              # Sent to the distillate
heavy_recovery = 0.96              # Sent to the bottoms
reflux_multiplier = 1.50
feed_position = 0.50               # Top = 0, bottom = 1

if not isclose(sum(z), 1.0) or any(fraction <= 0 for fraction in z):
    raise ValueError("Use positive feed mole fractions that sum to one.")
if not all(a > b > 0 for a, b in zip(alpha, alpha[1:])):
    raise ValueError("List the components in descending positive volatility.")
if not 0 <= q <= 1 or not 0 <= feed_position <= 1:
    raise ValueError("Feed quality and feed position must be between zero and one.")
if not (0.5 < light_recovery < 1 and 0.5 < heavy_recovery < 1):
    raise ValueError("Choose key recoveries greater than 0.5 and below one.")
if reflux_multiplier <= 1:
    raise ValueError("Choose operating reflux above the minimum.")

# Course count after specifying the section tray pressures and heat duties.
components = len(z)
dof = (components + 13) - (components + 2) - 1 - 2 - 3 - 1

# 2. Apply the component material balance
# The example assumes the lighter nonkey goes overhead and the heavier
# nonkey goes to the bottoms.
fraction_to_distillate = [1.0, light_recovery, 1.0 - heavy_recovery, 0.0]
feed_i = [feed_moles * fraction for fraction in z]
distillate_i = [
    moles * recovery for moles, recovery in zip(feed_i, fraction_to_distillate)
]
bottoms_i = [f - d for f, d in zip(feed_i, distillate_i)]
distillate = sum(distillate_i)
bottoms = sum(bottoms_i)
x_d = [moles / distillate for moles in distillate_i]
x_b = [moles / bottoms for moles in bottoms_i]

# 3. Calculate Fenske's minimum stage count
top_ratio = x_d[light] / x_d[heavy]
bottom_ratio = x_b[light] / x_b[heavy]
key_volatility = alpha[light] / alpha[heavy]
n_min = log(top_ratio / bottom_ratio) / log(key_volatility)

# 4. Solve the Underwood equations
def underwood_sum(composition, theta):
    return sum(a * x / (a - theta) for a, x in zip(alpha, composition))


# The feed sum increases between these two adjacent volatilities.
lower, upper = alpha[heavy], alpha[light]
for _ in range(50):
    midpoint = (lower + upper) / 2
    if underwood_sum(z, midpoint) < 1 - q:
        lower = midpoint
    else:
        upper = midpoint

theta = (lower + upper) / 2
r_min = underwood_sum(x_d, theta) - 1
if r_min <= 1e-12:
    raise ValueError("This example needs a positive Underwood minimum reflux.")

# 5. Estimate stages at working reflux
r = reflux_multiplier * r_min
x = (r - r_min) / (r + 1)
exponent = (1 + 54.4 * x) / (11 + 117.2 * x) * (x - 1) / sqrt(x)
one_minus_y = exp(exponent)
if not one_minus_y:
    raise ValueError("Increase reflux to move away from the pinch.")
y = 1 - one_minus_y
stages = (n_min + 1) / one_minus_y - 1

# Round up and reserve one stage for the reboiler.
whole_stages = max(2, ceil(stages))
trays = whole_stages - 1
trays_above_feed = floor(feed_position * (trays - 1) + 0.5)
feed_tray = trays_above_feed + 1

# 6. Report the results
print(f"Independent design choices: {dof}")
print(f"{names[light]} recovery to distillate: {light_recovery:.0%}")
print(f"{names[light]} in distillate: {x_d[light]:.2%}")
print(f"Distillate: {distillate:.2f} mol, bottoms: {bottoms:.2f} mol")
print(f"Fenske minimum stages: {n_min:.2f}")
print(f"Underwood root: {theta:.5f}")
print(f"Underwood minimum reflux: {r_min:.5f}")
print(f"Operating reflux: {r:.5f}")
print(f"Gilliland X: {x:.5f}, Y: {y:.5f}")
print(f"Estimated stages: {stages:.2f}")
print(f"Whole stages: {whole_stages} ({trays} trays + 1 reboiler)")
print(f"Feed tray from the top: {feed_tray}")
