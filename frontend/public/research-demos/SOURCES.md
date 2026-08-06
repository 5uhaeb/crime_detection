# UCA resolution-test demos

These three 20-second clips were extracted from the bounded `test.zip` evaluation configuration in the [`jinmang2/ucf_crime`](https://huggingface.co/datasets/jinmang2/ucf_crime) research mirror. That mirror labels the dataset CC0. The corresponding natural-language descriptions and timestamps come from [`Xuange923/Surveillance-Video-Understanding`](https://github.com/Xuange923/Surveillance-Video-Understanding), whose UCA annotations are Apache-2.0 and intended for academic/research use.

| Demo file | UCF-Crime source | Processing |
| --- | --- | --- |
| `arrest-low-160x120.webm` | `Arrest002_x264.mp4` | First 20 seconds, downscaled from 320×240 to 160×120 |
| `arson-native-320x240.webm` | `Arson003_x264.mp4` | First 20 seconds, native 320×240 |
| `normal-upscaled-640x480.webm` | `Normal_Videos_050_x264.mp4` | First 20 seconds, upscaled from 320×240 to 640×480 |

The upscaled variant does not contain additional visual information. These controlled variants test resolution sensitivity; they are not independent source-quality samples and are not model training data.
