---
prose_through: 97
---

## What a neural network is for

A neural network is a general-purpose shape-maker: it approximates almost any relationship between inputs and outputs. Two refinements sharpen the picture of "any squiggle, any 3D object".

1. **A network is a function.** Each input gives exactly one output, so a network with 1 input and 1 output cannot draw a loop. The workaround is to choose the outputs differently: make the input *time* and the outputs *(x position, y position)*, and the network can trace a path that loops and crosses itself.
2. **Terrain fits directly, overhangs don't.** Two inputs (latitude, longitude) and one output (elevation) fit terrain. But an overhang, a cave or a coffee mug has two heights at one map point. The fix is to ask a different question: input a 3D point and output its *signed distance* to the surface (positive outside, negative inside). The object is where the output is zero. This is used in neural graphics.

In practice the "shape" is usually invisible. A 224×224 colour image is about 150,000 input numbers, so the network builds a faceted surface in 150,000 dimensions.

Why it works splits into two questions. First, why it *can* represent almost anything: ReLU hinges glue flat pieces together (universal approximation, covered below). Second, why it actually works on real problems: how training finds good settings (UDL Ch 6-7) and why fitting the training data generalises to new data (Ch 8-9, and partly still an open question, Ch 20).

### Choosing inputs and outputs

For images, audio and video the input is usually the raw numbers the data is made of, and the output defines the task.

- **Images:** pixels scaled to 0-1, so 224 × 224 × 3 = 150,528 numbers. Outputs can be class scores (1,000 for ImageNet), boxes plus labels, or one label per pixel (for example satellite land-cover maps).
- **Audio:** raw samples (16,000 per second, so 160,000 numbers for 10 seconds) or a spectrogram (80 bands × 100 steps per second, so 80,000 numbers for 10 seconds). Outputs can be a transcript, a speaker, or the next chunk of sound.
- **Video:** stacks of frames. 16 frames of 224×224 colour is about 2.4 million numbers. Outputs can be an action label, a caption, or the next frame.
- **Self-supervision:** make the output the next piece of the data itself (the next frame, the next word), so the data labels itself. This is how large language models are trained.

Feeding raw pixels into a fully connected shallow network is impractical: 150,528 inputs × 1,000 hidden units is about 150 million first-layer weights. Convolutional networks (UDL Ch 10) redesign the wiring to avoid this.

## Shallow Neural Networks {#shallow}

Taught from [Understanding Deep Learning (Prince), Ch 3: Shallow neural networks](https://udlbook.github.io/udlbook/).

A shallow neural network is linear regression with hinges added.

### Linear regression, and why adding lines never helps

Linear regression is `y = phi0 + phi1·x`. It has two knobs (a height and a slope) and can only draw a straight line. Adding lines together never helps: (1 + 2x) + (3 − x) = 4 + x, which is still a line. Something must bend each line *before* the lines are summed.

### ReLU is the bending tool

ReLU turns negatives into 0 and passes positives through unchanged: ReLU(−7) = 0 and ReLU(4) = 4. A line passed through ReLU becomes a hockey stick: flat at zero, then rising from the point where the line crossed zero. That point is a **hinge** (also called a joint).

An everyday example is an auto-rickshaw fare of Rs 30 for the first 2 km, then Rs 15 per km:

```
fare = 30 + 15 · ReLU(km − 2)
at 1 km:  30 + 15 · 0 = Rs 30
at 6 km:  30 + 15 · 4 = Rs 90
```

That is a network with one hinge, which linear regression cannot express.

**ReLU's one job is to put a bend into each hidden unit's line.** Without it, any number of hidden units collapses back into linear regression. A worked example: take the units 2x − 4 and −x + 6, and make the output unit 1 + 3 × unit 2.

```
Without ReLU:  (2x − 4) + 3(−x + 6) = −x + 14        one straight line
               x=1 → 13,  x=3 → 11,  x=7 → 7

With ReLU:     x=1 → 0 + 3·5 = 15
               x=3 → 2 + 3·3 = 11
               x=7 → 10 + 3·0 = 10
```

Without ReLU the three outputs lie on one line. With ReLU the average slope is −2 per unit from x=1 to x=3 and −0.25 per unit from x=3 to x=7, so the output is no longer a single line.

This holds for depth as well as width. A network with 3 hidden layers of 500 units and *no* activation functions is still just a straight line: a line fed into a line is a line (layer 1: 3x + 1; layer 2: 2 × that + 4 = 6x + 6). The result is the best straight line through the data, which is Chapter 2's linear regression. For a symmetric hill of data, that is a nearly flat line at the hill's average height. The 1,500 hidden units added nothing, because only the activation creates bends.

### Equation 3.1, decoded with an electricity tariff

Take a slab tariff: a fixed charge of Rs 50, Rs 3 per unit up to 100 units, Rs 6 per unit from 100 to 300, and Rs 9 per unit above 300. Each slab adds Rs 3 per unit to the slope. As a network:

```
h1 = ReLU(0 + 1x)
h2 = ReLU(−100 + 1x)
h3 = ReLU(−300 + 1x)
bill = 50 + 3·h1 + 3·h2 + 3·h3
```

At 250 units: h1 = 250, h2 = 150, h3 = 0, so bill = 50 + 750 + 450 = Rs 1,250. This matches the slab calculation (100 × 3 + 150 × 6 + 50 = 1,250).

The symbols:

- `theta_d0` is the intercept of hidden unit d's line, and `theta_d1` is its slope. The hinge sits at x = −theta_d0 / theta_d1.
- `a[.]` is the activation function (ReLU here).
- `h1..h3` are the hidden units.
- `phi1..phi3` say how much each hinge changes the slope, and `phi0` is the overall height.
- Subscripts read "which hidden unit, then 0 for intercept or 1 for slope".

This is ten knobs instead of Chapter 2's two. Training is unchanged: use a least-squares loss and search for the knob values that minimise it.

### Vocabulary and traps

A hidden unit is **active** past its hinge and **inactive** when clipped to zero. The slope of any region is the *sum* of the slope contributions of the active units. In the tariff above 300 units, that is 3 + 3 + 3 = Rs 9 per unit. Slope and slope *change* are different things, and mixing them up is a common trap.

D hidden units give at most D hinges and so at most D + 1 straight pieces. The word "at most" matters: with 5 hidden units the curve has up to 6 pieces, and fewer if two hinges coincide or a unit's weight is zero. Negative weights let the curve bend downward, so a network can rise, fall and rise again. For a smooth hill, 5 hidden units give a six-segment approximation, and 50 hidden units give pieces short enough to approximate the hill closely.

### Only three of the four slopes are independent (section 3.1.1)

Give each unit one number `c_d`: its slope contribution when active. Every region's slope is a sum of the c's of the active units, so four region slopes come from three numbers, and the fourth is forced. If all units switch on to the right, the leftmost region has no active units and its slope is 0. If some units face left (a negative theta slope), the forced slope is instead a sum of other regions' slopes. For example, hinges at 1, 2 and 3 with c = 2, −1 (left-facing) and 3 give slopes −1, 1, 2 and 5, and 1 = −1 + 2. The practical meaning: three units can't draw four unrelated slopes. You need a fourth unit.

### More inputs and more outputs

With 2 inputs, each hinge becomes a *line* across the map. The lines cut the map into polygons, and over each polygon the output is a flat, tilted plane, like a faceted gemstone laid over terrain.

With several outputs, the outputs share the hidden units, so every output can only bend at the same joints. If the price output bends at x = 2, 5 and 8, the demand output can bend only there too, though it may not bend at all three: a zero weight on a hidden unit removes that bend from one output.

### Universal approximation (section 3.2)

With enough hidden units, a shallow network can approximate any continuous function on a bounded range as closely as you want: more, shorter straight pieces, like a many-sided polygon approximating a circle. This is an **existence result**. It promises that *some* network with enough hidden units can match the function. It does *not* promise:

- **How many units are needed.** It could be millions.
- **That training will find the right settings.** A route exists, but there is no map.
- **That the network will predict well on new data.**

Tempting but wrong: reading the theorem as "a shallow network with 100 hidden units, trained on my 500 house-price records, will accurately predict prices for new houses." That claim fails on all three points above. It also mixes up *the function* with *my data*. The theorem is about approximating the true function, while 500 noisy records are only a sample of it, which is another face of the generalisation problem (Ch 8).

## Deep Neural Networks {#deep}

Taught from [Understanding Deep Learning (Prince), Ch 4: Deep neural networks](https://udlbook.github.io/udlbook/).

### Why stack layers instead of widening one

A wider layer *adds* hinges: D units give at most D + 1 pieces. A new layer *multiplies* them.

### Folding (section 4.1)

Compose two 3-unit shallow networks and set the first to zigzag. As x goes from 0 to 1, y rises from 0 to 1. From 1 to 2, y falls back to 0. From 2 to 3, y rises again. Three stretches of x all land on the *same range* of y, like folding a paper strip into a Z.

The second network draws its own 3-piece pattern over y in [0, 1]. Because three stretches were folded onto that range, the pattern is drawn three times, once per stretch, and stretches that run backwards give mirrored copies. The result is 3 × 3 = 9 pieces from 6 hidden units, against at most 7 for one layer of 6. With nine units, one layer gives 10 pieces, while three layers of 3 units, each folding 3 ways, give 3 × 3 × 3 = 27.

Two points are easy to get wrong:

- **The fold is overlap.** The key idea is that different input stretches map onto the same output range and land on top of each other. The second layer does not multiply anything. The piece *count* multiplies, because one pattern is copied once per stretch.
- **Stretches need not be equal length.** Training places the joints wherever it likes.

**The catch:** the pieces are copies of one pattern, flipped and stretched. They are not free choices, so the copies cannot be different patterns (one a bump, another a step). Depth wins when the target has repeated or reused structure: edges look alike anywhere in a photo, and a syllable sounds similar in any word. Early layers build a part once, and later layers reuse it everywhere. With ReLU, a deep network still draws straight pieces joined at hinges. Depth changes how many pieces you get per knob, not their kind. Real networks fold less neatly, because training decides where and how much.

### Two hidden layers (equations 4.7-4.9)

A new letter, psi, names the layer-1 to layer-2 knobs. Theta names the input to layer 1, and phi′ names layer 2 to the output. A prime means "second-layer version". Every layer does the same three steps: multiply each input by a knob, add them up with an offset, and clip with ReLU.

- Layer-1 units read one input, so each has 2 knobs.
- Layer-2 units read *all* layer-1 units, so each has 4 knobs (an offset plus 3 weights).
- The output is a weighted sum plus an offset, with no clipping.
- `psi_23` means how much second-layer unit 2 listens to first-layer unit 3. The first digit is the receiver, the second digit is the source, and 0 means the offset.
- Total: 6 theta + 12 psi + 4 phi′ = 22 knobs, against 19 for a 6-unit shallow network.

A worked example at x = 2:

```
Layer 1 (offset, slope):  (−1, 1)   (1, −1)   (−3, 2)
  before ReLU:             1         −1         1
  after ReLU:         h = [1, 0, 1]

Layer 2 rows (offset; weights on h1, h2, h3):
  (0; 2, 1, −1)   → 0 + 2·1 + 1·0 − 1·1  =  1
  (−1; 1, 3, 1)   → −1 + 1·1 + 3·0 + 1·1 =  1
  (2; −1, 0, −3)  → 2 − 1·1 + 0 − 3·1    = −2 → ReLU → 0
  h′ = [1, 1, 0]

Output: 0.5 + 2·1 + 1·1 + 4·0 = 3.5
```

An inactive unit (h2 = 0) is silent to the whole next layer. Renaming the composed products theta′ × phi as free psi values is why a two-layer network is a broader family than two stacked shallow networks.

### Matrix notation (section 4.4)

Matrix notation adds no new maths. A vector is a column of numbers and a matrix is a grid. Matrix × vector means: for each row, multiply item by item and add up. That is exactly each unit's recipe, with one row per unit. The shorthand (4.14) is:

```
h  = a[theta0 + theta x]
h′ = a[psi0 + Psi h]
y′ = phi′0 + phi′ h′
```

The general form (4.15) uses beta for biases (offsets) and Omega for weight grids, with the subscript naming the layer being read from: `h_{k+1} = a[beta_k + Omega_k h_k]`. The output has no ReLU. Notes on reading it:

- **4.15 is a chain, not a sum over k.** Each step's output feeds the next, and the intermediate lists are discarded. The only summation is inside each matrix-vector product, over the previous layer's units.
- **The matrices never multiply each other.** The ReLU between steps prevents merging them. Without it, Omega2 × Omega1 × Omega0 would collapse to one linear map.
- **Bold h_k means a whole layer.** In Ch 3 and equations 4.7-4.9, h_k meant one unit.
- **Matrix sizes:** rows equal the units in the layer being fed, and columns equal the units in the layer read from. Each bias vector is as long as the layer it feeds.

Figure 4.6 has 3 inputs, layers of 4, 2 and 3 units, and 2 outputs. The Omega sizes are 4×3, 2×4, 3×2 and 2×3, which is 32 weights, plus 11 biases, so 43 knobs. Equation 4.16 nests every step, so read it from the innermost bracket outwards.

Why use matrices at all: the notation does not grow with width, and GPUs (NVIDIA Tensor Cores) are built for matrix multiplication. Most of a network's compute is the Omega × h step.

### How many pieces? (figure 4.7)

The x-axis is the number of parameters (the cost) and the y-axis is the maximum number of linear regions, on a log scale where each gridline is 100× the one before. Each curve fixes the depth K, and each dot adds one unit per layer. A shallow network has D + 1 pieces, and a deep one has (D + 1)^K.

```
At about 480 knobs, 1 input:
K=1  (159 units)           ~160 pieces
K=2  (19 units per layer)   400
K=3  (14 units per layer)   3,375
K=4  (11 units per layer)   20,736
K=5  (10 units per layer)   161,051   (471 knobs = 20 + 4·110 + 11)
```

Panel (b) uses 10 inputs. Hinges become flat cuts through 10-dimensional space that intersect in far more ways: 3 points cut a line into 4 pieces, and 3 lines cut a plane into up to 7. With K=5 and D=50 (10,801 knobs), there are more than 10^40 regions.

Two caveats. These are *maxima*. And the deep pieces are folded copies, not independent ones. With a budget of about 500 knobs, one input and one output, option A (one hidden layer of about 160 units) has about 160 straight *pieces* (note that this is pieces, not units), while option B (5 hidden layers of 10 units) has about 161,000. B's extra pieces only help if the data has that kind of repeated structure. For 160 unrelated wiggles, A's free pieces may fit better.

### Images as input (section 4.5.4)

An image becomes a list of brightness numbers (0-255, scaled to 0-1, with 3 per pixel for colour), unrolled row by row. A 1,000 × 1,000 grayscale image is 10^6 inputs. With 1,000 first-layer units, that is 10^9 weights, about 4 GB, which is prohibitive. There are two more problems:

- **Unrolling hides neighbours.** The pixel above or below lands a whole row-length away in the list.
- **Each position has its own weights.** An object must be relearned at every position. A 10×10 eye has about 982,000 possible positions in a 10^6-pixel image.

The fix is a small 3×3 detector (10 knobs) slid over every position and reused. Stacked layers see wider areas: local to global (Ch 10).

**Receptive field.** Windows stay 3×3 at every layer, but layer 2 reads layer-1 *answers*, so it covers 5×5 original pixels, and layer 3 covers 7×7. The area grows by 2 per layer, reaching 21×21 at layer 10. **Downsampling** (for example keeping the max of each 2×2 block) halves the grid, so the same window covers twice the original area. This is like GIS map pyramids or zoom levels. In a typical 224×224 network the grid shrinks 224 → 112 → 28 → 7 while the detector types grow 3 → 64 → 256 → 512 (edges, then textures, then parts). That is a tidy story, and the reality is messier.

### Over-parameterised models (section 4.5.5)

An over-parameterised model has more knobs than training examples, for example about 25 million knobs on about 1.3 million images. Think of each example as one condition and each knob as one freedom. Two points and two knobs give one line. Three points and two knobs force a compromise. Three points and 10 knobs give endlessly many perfect fits. So classical statistics predicts that such a model memorises noise (overfitting).

What is actually observed: training gets *easier* (there are many roughly equivalent good solutions, like parking in an empty lot), and deep over-parameterised networks still generalise surprisingly well. This is not fully understood (Ch 8, Ch 20). Very deep networks become hard to train again (Ch 11, residual networks).

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Training: loss and finding good knob settings (UDL Ch 6-7) | Intermediate | [Shallow Neural Networks](#shallow) | Universal approximation says a good network exists. Training is how you find one. |
| Convolutional networks (UDL Ch 10) | Intermediate | [Deep Neural Networks](#deep) | The redesigned wiring that fixes the weight explosion and the relearn-at-every-position problem for images. |
| Residual networks (UDL Ch 11) | Intermediate | [Deep Neural Networks](#deep) | Very deep networks become hard to train again, and residual connections address it. |
| Generalisation and why over-parameterised networks work (UDL Ch 8-9, 20) | Advanced | [Deep Neural Networks](#deep) | Fitting the training data is not the same as predicting well on new data, and part of why it works is still open. |

## Where things stand

This page is needs-review. **Shallow Neural Networks:** both early gaps are resolved. The role of ReLU (without an activation, sums of lines stay a line, and ReLU adds the bends) and universal approximation as an existence result (no bound on units, no guarantee that training finds the network, no guarantee of generalisation) were both missed in the first quiz. Both were answered correctly in the retest, including a three-layer network with no activations and a claim that the theorem proves a house-price model will work. The page still shows needs-review because the next spaced review date has passed. **Deep Neural Networks:** this is the shakier section. A quiz was stopped partway, after 2 of 5 questions. The comparison between one wide layer and five narrow layers at about 500 knobs was correct, including why the extra pieces might not help. The question on what "folding" means was missed: the description was of equal-length segments and of the second layer "multiplying", when the real idea is stretches overlapping onto the same output range, and the pattern being copied once per stretch. The three questions still to answer are the size of the weight grid between two hidden layers (and the offsets feeding the second one), the problems with feeding large satellite tiles into a fully connected network, and what the book says happens with far more knobs than examples. The next step is to retest folding first, then finish those three.

## Related pages

- [Review Schedule](../review-schedule.html) — spaced-repetition status.
