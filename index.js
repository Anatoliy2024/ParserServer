import axios from "axios"
import express from "express"
import cors from "cors"
import * as cheerio from "cheerio"
import pLimit from "p-limit"

const limit = pLimit(5)
const app = express()

app.use(
  cors({
    origin:
      "https://parser-client-git-main-anatoliys-projects-59469f9d.vercel.app",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)
app.get("/", (req, res) => {
  res.send("Привет, Мир")
})
// app.get("/api/clinic", async (req, res) => {

//   try {
//     const { data: html } = await axios.get(
//       "https://glazahelp.ru/regiony-kliniki/"
//     )
//     const $ = cheerio.load(html)
//     let clinics = []

//     const linkRegions = $(".overlay_image_box")
//       .map((index, elem) => {
//         return $(elem).attr("data-link")
//       })
//       .get()

//     const regionPromises = linkRegions.map(async (linkRegions) => {
//       return limit(async () => {
//         try {
//           const { data: htmlRegion } = await axios.get(linkRegions, {
//             timeout: 20000,
//           })
//           const $ = cheerio.load(htmlRegion)

//           const clinicsLinks = $(".left a")
//             .map((i, el) => {
//               clinics.push([$(el).attr("href"), $(el).text()])
//               return $(el).attr("href")
//             })
//             .get()

//           const clinicPromise = clinicsLinks.map(async (clinicLink) => {
//             console.log("clinicLink", clinicLink)
//             try {
//               const { data: clinicData } = await axios.get(clinicLink, {
//                 timeout: 20000,
//               })
//               const $ = cheerio.load(clinicData)
//               const fullText = $("div.text.text_block")
//                 .filter(function () {
//                   return $(this).text().includes("Адрес")
//                 })
//                 .first()
//                 .text()

//               const regex = /Адрес\s*:\s*([\s\S]*?)\s*Телефон/
//               const address = fullText.match(regex)

//               clinics = clinics.map((el) => {
//                 if (el[0] === clinicLink) {
//                   return [...el, address[1]]
//                 } else {
//                   return el
//                 }
//               })

//               console.log("clinics", clinics)
//             } catch (e) {
//               console.log(e)
//             }
//           })
//           // res.json(clinics)
//           await Promise.all(clinicPromise)
//         } catch (e) {
//           console.log(e)
//         }
//       })
//     })

//     await Promise.all(regionPromises)
//     res.json(clinics)
//   } catch (e) {
//     console.log(e)
//     res.status(500).send("Error occurred")
//   }
// })

app.get("/api/clinic", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  try {
    const { data: html } = await axios.get(
      "https://glazahelp.ru/regiony-kliniki/"
    )
    const $ = cheerio.load(html)
    const linkRegions = $(".overlay_image_box")
      .map((index, elem) => $(elem).attr("data-link"))
      .get()
    let clinics = {}
    for (const linkRegion of linkRegions) {
      // Изменил здесь с linkRegions на linkRegion
      await limit(async () => {
        try {
          const { data: htmlRegion } = await axios.get(linkRegion, {
            timeout: 20000,
          })
          const $ = cheerio.load(htmlRegion)
          // const clinicsLinks = $(".left a").map((i, el) => $(el).attr("href")).get();
          const clinicsLinks = $(".left a")
            .map((i, el) => {
              clinics[$(el).attr("href")] = $(el).text()
              return $(el).attr("href")
            })
            .get()

          for (const clinicLink of clinicsLinks) {
            console.log("clinicLink", clinicLink)
            try {
              const { data: clinicData } = await axios.get(clinicLink, {
                timeout: 20000,
              })
              const $ = cheerio.load(clinicData)
              const fullText = $("div.text.text_block")
                .filter(function () {
                  return $(this).text().includes("Адрес")
                })
                .first()
                .text()

              const regex = /Адрес\s*:\s*([\s\S]*?)\s*Телефон/
              const address = fullText.match(regex)

              // Отправляем данные клиенту по мере их обработки
              res.write(
                `data: ${JSON.stringify({
                  link: clinicLink,
                  city: clinics[clinicLink],
                  address: address[1],
                })}\n\n`
              )
            } catch (e) {
              console.log(e)
            }
          }
        } catch (e) {
          console.log(e)
        }
      })
    }
  } catch (e) {
    console.log(e)
    res.status(500).send("Error occurred")
  } finally {
    res.end()
  }
})

export default app
// app.listen(5001, () => {
//   console.log("Server is running PORT 5000")
// })
