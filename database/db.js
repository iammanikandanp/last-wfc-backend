import mongoose from "mongoose"
import dotenv from "dotenv"
import dns from "dns"
dotenv.config()

// Some networks run a DNS server that refuses SRV lookups, which breaks
// mongodb+srv:// connection strings. Point Node's resolver at public DNS.
dns.setServers(["8.8.8.8", "1.1.1.1"])

const connectDb=async () => {
    try {
        await mongoose.connect(process.env.DB)
        console.log("DB Name",process.env.DB)
        console.log("mongodb connect successfully! ")
       
    } catch (error) {
        console.log("DB Name",process.env.DB)
        console.log("Error connecting to database",error)
        process.exit(1)
    }
}
export default connectDb
