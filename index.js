const express = require('express');
const app = express();
const mongoose = require('mongoose');
 
mongoose.connect('mongodb://mongodb:27017/bigcities', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));
 
const citySchema = new mongoose.Schema({
  Name: String,
  'ASCII Name': String,
  'ISO Alpha-2': String,
  'ISO Name EN': String,
  Population: Number,
  Timezone: String,
  'Modification date': String,
  Coordinates: String
});
const City = mongoose.model('City', citySchema);
 
app.get('/', (req, res) => {
  res.send('Welcome to the Node Application (debugging)');
});
 
app.get('/cities/v1/all', async (req, res) => {
  try {
    let filter = {};
    if (req.query.gte || req.query.lte) {
      filter.Population = {};
      if (req.query.gte) filter.Population.$gte = Number(req.query.gte);
      if (req.query.lte) filter.Population.$lte = Number(req.query.lte);
    }
 
    const cities = await City.find(filter)
      .sort(filter.Population ? { Population: -1 } : { _id: 1 })
      .select("-__v")
      .lean();
 
    if (!cities.length) {
      return res.status(404).json({ error: "No record for this population range" });
    }
 
    const modifiedCities = cities.map(city => ({
      ...city,
      Coordinates: {
        lat: parseFloat(city.Coordinates.split(',')[0]),
        lng: parseFloat(city.Coordinates.split(',')[1])
      }
    }));
 
    res.status(200).json(modifiedCities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
mongoose.connection.on('connected', () => console.log('Mongoose connected to db'));
mongoose.connection.on('error', (err) => console.log(err.message));
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection is disconnected...');
  process.exit(1);
});
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
 
app.get('/cities/v1/alpha', async (req, res) => {
  try {
    const alphaCodes = await City.aggregate([
      {
        $group: {
          _id: '$ISO Alpha-2',
          name: { $first: '$ISO Name EN' }
        }
      },
      {
        $project: {
          _id: 0,
          code: '$_id',
          name: 1
        }
      },
      { $sort: { code: 1 } }
    ]);
 
    res.status(200).json(alphaCodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.get('/cities/v1/alpha/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const cities = await City.find({ 'ISO Alpha-2': code }, 'ASCII Name Population Timezone Coordinates')
      .sort({ Population: -1 })
      .lean();
 
    if (!cities.length) {
      return res.status(404).json({ error: 'No record for this alpha code' });
    }
 
    const modifiedCities = cities.map(city => ({
      ...city,
      Coordinates: {
        lat: parseFloat(city.Coordinates.split(',')[0]),
        lng: parseFloat(city.Coordinates.split(',')[1])
      }
    }));
 
    res.status(200).json(modifiedCities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.get('/cities/v1/region', async (req, res) => {
  try {
    const regions = await City.aggregate([
      {
        $project: {
          region: { $split: ['$Timezone', '/'] }
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$region', 0] }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
 
    res.status(200).json(regions.map(r => r._id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.get('/cities/v1/region/:region', async (req, res) => {
  try {
    const region = req.params.region;
    const cities = await City.find({ 'Timezone': new RegExp('^' + region) }, 'ASCII Name ISO Alpha-2 ISO Name EN Population Timezone Coordinates')
      .sort({ Population: -1 })
      .lean();
 
    if (!cities.length) {
      return res.status(404).json({ error: 'No record for this region' });
    }
 
    const modifiedCities = cities.map(city => ({
      ...city,
      Coordinates: {
        lat: parseFloat(city.Coordinates.split(',')[0]),
        lng: parseFloat(city.Coordinates.split(',')[1])
      }
    }));
 
    res.status(200).json(modifiedCities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.get('/cities/v1/:city', async (req, res) => {
  try {
    const city = req.params.city;
    let query = { 'ASCII Name': city };
 
    if (req.query.partial === 'true') {
      query = { 'ASCII Name': new RegExp(city, 'i') };
    }
 
    if (req.query.alpha) {
      query['ISO Alpha-2'] = req.query.alpha;
    }
 
    if (req.query.region && !req.query.alpha) {
      query.Timezone = new RegExp('^' + req.query.region);
    }
 
    let sort = { _id: 1 };
    if (req.query.sort === 'alpha') {
      sort = { 'ISO Alpha-2': 1 };
    } else if (req.query.sort === 'population') {
      sort = { Population: -1 };
    }
 
    const cities = await City.find(query, '_id ASCII Name ISO Alpha-2 ISO Name EN Population Timezone Coordinates')
      .sort(sort)
      .lean();
 
    if (!cities.length) {
      return res.status(404).json({ error: 'No record for this city name' });
    }
 
    const modifiedCities = cities.map(city => ({
      ...city,
      Coordinates: {
        lat: parseFloat(city.Coordinates.split(',')[0]),
        lng: parseFloat(city.Coordinates.split(',')[1])
      }
    }));
 
    res.status(200).json(modifiedCities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.all('*', (req, res) => {
  res.status(400).json({ error: `Cannot ${req.method} ${req.path}` });
});
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({'error': err.message});
});
 
app.listen(3000, () => {
  console.log('Weather app listening on port 3000!')
});